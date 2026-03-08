
-- Create challenge_rewards table
CREATE TABLE public.challenge_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 3),
  reward_type text NOT NULL,
  reward_value text,
  photo_url text,
  unlocked boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id, week_number)
);

ALTER TABLE public.challenge_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge rewards"
  ON public.challenge_rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge rewards"
  ON public.challenge_rewards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge rewards"
  ON public.challenge_rewards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for outfit photos
INSERT INTO storage.buckets (id, name, public) VALUES ('reward-photos', 'reward-photos', true);

CREATE POLICY "Authenticated users can upload reward photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reward-photos');

CREATE POLICY "Anyone can view reward photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reward-photos');

CREATE POLICY "Users can delete own reward photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reward-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

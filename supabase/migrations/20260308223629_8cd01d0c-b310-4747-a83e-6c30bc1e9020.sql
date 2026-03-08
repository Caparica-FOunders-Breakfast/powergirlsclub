
-- Create challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Challenge',
  start_date date NOT NULL,
  end_date date NOT NULL,
  invite_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add challenge_id to profiles
ALTER TABLE public.profiles ADD COLUMN challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Policies: all authenticated can view challenges they're part of
CREATE POLICY "Challenges viewable by participants"
  ON public.challenges FOR SELECT TO authenticated
  USING (
    id IN (SELECT challenge_id FROM public.profiles WHERE challenge_id IS NOT NULL)
  );

CREATE POLICY "Authenticated can create challenges"
  ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update challenge"
  ON public.challenges FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete challenge"
  ON public.challenges FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Allow reading challenges by invite_code (for joining)
CREATE POLICY "Anyone can find challenge by invite code"
  ON public.challenges FOR SELECT TO authenticated
  USING (true);

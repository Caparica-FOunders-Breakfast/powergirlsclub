
-- Drop existing unique constraint if any (challenge_id, user_id, week_number)
ALTER TABLE public.challenge_rewards DROP CONSTRAINT IF EXISTS challenge_rewards_challenge_id_user_id_week_number_key;

-- Add chosen_by column to track who (the winner) set this reward
ALTER TABLE public.challenge_rewards ADD COLUMN IF NOT EXISTS chosen_by uuid;

-- Create a unique constraint per challenge per week (one reward per week per challenge)
ALTER TABLE public.challenge_rewards ADD CONSTRAINT challenge_rewards_challenge_week_unique UNIQUE (challenge_id, week_number);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can insert own challenge rewards" ON public.challenge_rewards;
DROP POLICY IF EXISTS "Users can update own challenge rewards" ON public.challenge_rewards;
DROP POLICY IF EXISTS "Users can view own challenge rewards" ON public.challenge_rewards;

-- New RLS: All challenge participants can view rewards
CREATE POLICY "Challenge participants can view rewards"
ON public.challenge_rewards FOR SELECT TO authenticated
USING (
  challenge_id IN (
    SELECT challenge_id FROM public.profiles WHERE challenge_id IS NOT NULL
  )
);

-- Only the chosen_by user can insert/update
CREATE POLICY "Winner can insert challenge rewards"
ON public.challenge_rewards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = chosen_by);

CREATE POLICY "Winner can update challenge rewards"
ON public.challenge_rewards FOR UPDATE TO authenticated
USING (auth.uid() = chosen_by);

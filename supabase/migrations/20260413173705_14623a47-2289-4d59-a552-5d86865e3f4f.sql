
-- 1. Fix user_roles: Remove self-service INSERT policy (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- Only admins can assign roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Fix reward-photos storage: Add ownership check to INSERT policy
DROP POLICY IF EXISTS "Anyone can upload reward photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload reward photos" ON storage.objects;

-- Recreate with ownership check (first path segment must match auth.uid())
CREATE POLICY "Users can upload own reward photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reward-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Fix challenges: Replace overly broad SELECT policies
DROP POLICY IF EXISTS "Anyone can find challenge by invite code" ON public.challenges;
DROP POLICY IF EXISTS "Challenges viewable by participants" ON public.challenges;

-- Single policy: user can see challenges they participate in OR all challenges (needed for invite code lookup)
-- We scope it so invite_code is not broadly exposed by using a function
CREATE POLICY "Participants can view own challenge"
ON public.challenges
FOR SELECT
TO authenticated
USING (
  id = (SELECT challenge_id FROM public.profiles WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

-- Separate narrow policy for invite code lookup (RPC is better but this works)
-- Users need to be able to find a challenge by invite code to join
CREATE POLICY "Lookup challenge by invite code"
ON public.challenges
FOR SELECT
TO authenticated
USING (true);

-- Actually, we need a different approach: we can't prevent SELECT of all rows 
-- while also allowing invite code lookup without an RPC. Let's use a security definer function instead.
-- First, drop the broad policy we just created
DROP POLICY IF EXISTS "Lookup challenge by invite code" ON public.challenges;

-- Create a security definer function for invite code lookup
CREATE OR REPLACE FUNCTION public.find_challenge_by_invite_code(_code text)
RETURNS TABLE (
  id uuid,
  name text,
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.start_date, c.end_date, c.created_by, c.created_at
  FROM public.challenges c
  WHERE c.invite_code = lower(trim(_code))
  LIMIT 1;
$$;

-- 4. Fix challenge_rewards: Scope SELECT to user's own challenge
DROP POLICY IF EXISTS "Challenge participants can view rewards" ON public.challenge_rewards;

CREATE POLICY "Participants can view own challenge rewards"
ON public.challenge_rewards
FOR SELECT
TO authenticated
USING (
  challenge_id = (SELECT challenge_id FROM public.profiles WHERE user_id = auth.uid())
);

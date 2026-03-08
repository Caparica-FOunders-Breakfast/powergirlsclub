
-- Add reward_details jsonb column to rewards for rich structured data
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS reward_details jsonb DEFAULT '{}'::jsonb;

-- Add team_code column to teams for join-by-code flow
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 6);

-- Update RLS: Allow any authenticated user to insert their own rewards (not just winners)
-- The existing policy already allows auth.uid() = chosen_by, which is correct for personal rewards

-- Allow authenticated users to create teams (not just admins) for the create/join flow
DROP POLICY IF EXISTS "Admins can insert teams" ON public.teams;
CREATE POLICY "Authenticated can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Allow any authenticated user to update their own profile team_id (for joining teams)
-- Already covered by existing "Users can update own profile" policy

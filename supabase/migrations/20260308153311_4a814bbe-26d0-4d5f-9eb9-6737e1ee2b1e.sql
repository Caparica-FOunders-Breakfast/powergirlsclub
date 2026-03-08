
-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by authenticated" ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teams" ON public.teams
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teams" ON public.teams
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add team_id to profiles
ALTER TABLE public.profiles ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to rewards
ALTER TABLE public.rewards ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add team_id to weekly_scores
ALTER TABLE public.weekly_scores ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

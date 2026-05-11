-- Per-user training preferences: frequency, selected training day indices, program start date,
-- and progress goal. One row per user (enforced via UNIQUE on user_id).
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- 3, 4, or 5 days/week
  frequency SMALLINT NOT NULL DEFAULT 5 CHECK (frequency BETWEEN 1 AND 7),
  -- Day indices where 0 = Monday … 6 = Sunday
  training_days SMALLINT[] NOT NULL DEFAULT '{0,2,3,4,5}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- 'healthy' (+1 kg/week) | 'aggressive' (+2 kg/week)
  progress_goal TEXT NOT NULL DEFAULT 'healthy' CHECK (progress_goal IN ('healthy', 'aggressive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at on row changes (mirrors other tables in the project).
CREATE OR REPLACE FUNCTION public.touch_user_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_preferences_updated_at();

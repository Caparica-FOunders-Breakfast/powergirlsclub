
-- Exercise logs for the static weekly plan
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  day_index INT NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  exercise_index INT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_used NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start, day_index, exercise_index)
);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise logs" ON public.exercise_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercise logs" ON public.exercise_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exercise logs" ON public.exercise_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_exercise_logs_updated_at
  BEFORE UPDATE ON public.exercise_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

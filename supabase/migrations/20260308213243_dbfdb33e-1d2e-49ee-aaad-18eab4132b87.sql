
CREATE TABLE public.user_workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_index INTEGER NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  label TEXT,
  emoji TEXT,
  is_rest BOOLEAN NOT NULL DEFAULT false,
  is_recovery BOOLEAN NOT NULL DEFAULT false,
  rest_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_index)
);

ALTER TABLE public.user_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans"
  ON public.user_workout_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout plans"
  ON public.user_workout_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
  ON public.user_workout_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
  ON public.user_workout_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

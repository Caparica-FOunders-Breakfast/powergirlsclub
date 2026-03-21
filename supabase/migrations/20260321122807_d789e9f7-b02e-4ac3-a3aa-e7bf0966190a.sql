
-- Table to track which exercises are hidden from the scorecard
CREATE TABLE public.scorecard_hidden_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_name)
);

-- Enable RLS
ALTER TABLE public.scorecard_hidden_exercises ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden exercises
CREATE POLICY "Users can view own hidden exercises"
ON public.scorecard_hidden_exercises FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can hide exercises"
ON public.scorecard_hidden_exercises FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide exercises"
ON public.scorecard_hidden_exercises FOR DELETE
USING (auth.uid() = user_id);

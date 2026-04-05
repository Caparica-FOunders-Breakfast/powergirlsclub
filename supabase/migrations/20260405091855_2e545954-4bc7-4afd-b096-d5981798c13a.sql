
CREATE TABLE public.meal_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  day_index INTEGER NOT NULL,
  meal_index INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start, day_index, meal_index)
);

ALTER TABLE public.meal_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal completions" ON public.meal_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal completions" ON public.meal_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal completions" ON public.meal_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

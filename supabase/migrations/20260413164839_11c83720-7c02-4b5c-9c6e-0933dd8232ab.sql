
CREATE TABLE public.meal_combos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  proteins TEXT[] NOT NULL DEFAULT '{}',
  veggies TEXT[] NOT NULL DEFAULT '{}',
  carbs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own combos" ON public.meal_combos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own combos" ON public.meal_combos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own combos" ON public.meal_combos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own combos" ON public.meal_combos FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_meal_combos_updated_at
  BEFORE UPDATE ON public.meal_combos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

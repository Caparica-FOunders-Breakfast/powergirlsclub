
CREATE TABLE public.language_custom_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  day_index integer NOT NULL,
  focus text NOT NULL,
  emoji text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_code, day_index)
);

ALTER TABLE public.language_custom_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom plans" ON public.language_custom_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom plans" ON public.language_custom_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom plans" ON public.language_custom_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom plans" ON public.language_custom_plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

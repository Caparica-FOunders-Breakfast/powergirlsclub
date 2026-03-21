
CREATE TABLE public.language_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  day_index integer,
  week_start date,
  original_text text NOT NULL,
  english_translation text,
  alt_translation text,
  alt_language_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.language_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocabulary" ON public.language_vocabulary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vocabulary" ON public.language_vocabulary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vocabulary" ON public.language_vocabulary FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vocabulary" ON public.language_vocabulary FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_vocabulary_user_lang ON public.language_vocabulary (user_id, language_code);

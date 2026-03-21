
CREATE TABLE public.language_day_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  day_index integer NOT NULL CHECK (day_index >= 0 AND day_index <= 5),
  url text NOT NULL,
  label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_code, day_index)
);

ALTER TABLE public.language_day_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links" ON public.language_day_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own links" ON public.language_day_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own links" ON public.language_day_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own links" ON public.language_day_links FOR DELETE USING (auth.uid() = user_id);

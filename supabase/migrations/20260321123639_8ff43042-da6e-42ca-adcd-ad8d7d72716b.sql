
-- Languages a user is learning
CREATE TABLE public.user_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_code)
);

ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own languages" ON public.user_languages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add languages" ON public.user_languages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove languages" ON public.user_languages FOR DELETE USING (auth.uid() = user_id);

-- Daily task completion per language
CREATE TABLE public.language_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language_code TEXT NOT NULL,
  week_start DATE NOT NULL,
  day_index INTEGER NOT NULL CHECK (day_index >= 0 AND day_index <= 4),
  task_index INTEGER NOT NULL CHECK (task_index >= 0 AND task_index <= 2),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_code, week_start, day_index, task_index)
);

ALTER TABLE public.language_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.language_daily_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.language_daily_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.language_daily_tasks FOR UPDATE USING (auth.uid() = user_id);

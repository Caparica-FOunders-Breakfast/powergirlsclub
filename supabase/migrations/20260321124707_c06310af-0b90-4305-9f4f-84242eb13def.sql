
-- Update task_index constraint to allow 4 tasks per day (0-3)
ALTER TABLE public.language_daily_tasks DROP CONSTRAINT language_daily_tasks_task_index_check;
ALTER TABLE public.language_daily_tasks ADD CONSTRAINT language_daily_tasks_task_index_check CHECK (task_index >= 0 AND task_index <= 3);

-- Allow day_index 5 for weekend bonus
ALTER TABLE public.language_daily_tasks DROP CONSTRAINT language_daily_tasks_day_index_check;
ALTER TABLE public.language_daily_tasks ADD CONSTRAINT language_daily_tasks_day_index_check CHECK (day_index >= 0 AND day_index <= 5);

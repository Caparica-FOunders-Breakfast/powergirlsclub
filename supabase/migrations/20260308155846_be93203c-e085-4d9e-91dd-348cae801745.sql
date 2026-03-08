
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS challenge_start date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS challenge_end date;

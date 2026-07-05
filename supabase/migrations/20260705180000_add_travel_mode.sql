-- Travel mode: a temporary, non-destructive overlay that swaps the user's plan
-- for bodyweight / calisthenics workouts while they're away from a gym. Stored
-- as a simple flag; the bodyweight plan itself is computed client-side, so the
-- user's saved plan is never overwritten.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS travel_mode boolean NOT NULL DEFAULT false;

-- Progression: the weekly working-weight increment (progressive overload).
-- This is the single source of truth for how much we add to targets each week
-- (auto-bump / deload logic, plan generator input, and progression summaries).
-- The old progress_goal enum ('healthy' | 'aggressive') is now deprecated — we
-- keep the column for now (do NOT drop) and backfill the numeric value from it.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS progression_kg_per_week numeric(3, 1) NOT NULL DEFAULT 1.0
    CHECK (progression_kg_per_week BETWEEN 0.5 AND 3.0);

-- Backfill existing rows from the deprecated progress_goal:
--   healthy    -> 1.0 kg/week
--   aggressive -> 2.0 kg/week
-- (New rows fall back to the 1.0 default.)
UPDATE public.user_preferences
SET progression_kg_per_week = CASE progress_goal
  WHEN 'aggressive' THEN 2.0
  ELSE 1.0
END
WHERE progress_goal IS NOT NULL;

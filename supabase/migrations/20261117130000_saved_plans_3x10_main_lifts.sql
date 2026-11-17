-- Saved plans: Barbell squat, Dumbbell shoulder press, Push ups and Assisted
-- pull ups become 3 sets of 10 in plans members already have (follows
-- 20261117120000, which changed the templates for new plans).
--
-- Plans store free-text names ("Barbell Squat", "Push-ups", "Assisted Pull Up"),
-- so names are matched after lowercasing and removing everything that isn't a
-- letter, with an optional trailing "s". Plain "Pull ups" (not assisted) is left
-- alone. Only the sets and reps fields change; weights, base weights and every
-- other field stay as they are. Travel plan rows (day_index >= 100) are skipped.
-- Idempotent: re-running changes nothing.
--
-- DRY RUN: to see which rows change, run this first:
--   SELECT user_id, day_index, label FROM public.user_workout_plans
--   WHERE day_index < 100 AND exercises IS DISTINCT FROM public.pc_main_lifts_3x10(exercises);

CREATE OR REPLACE FUNCTION public.pc_main_lifts_3x10(exercises jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN exercises IS NULL OR jsonb_typeof(exercises) <> 'array' THEN exercises
    ELSE COALESCE((
      SELECT jsonb_agg(
        CASE
          WHEN regexp_replace(lower(ex->>'name'), '[^a-z]', '', 'g')
               ~ '^(barbellsquats?|dumbbellshoulderpress(es)?|pushups?|assistedpullups?)$'
          THEN ex || jsonb_build_object('sets', 3, 'reps', '10')
          ELSE ex
        END
        ORDER BY ord)
      FROM jsonb_array_elements(exercises) WITH ORDINALITY AS t(ex, ord)
    ), '[]'::jsonb)
  END
$$;

UPDATE public.user_workout_plans
SET exercises = public.pc_main_lifts_3x10(exercises)
WHERE day_index < 100
  AND exercises IS DISTINCT FROM public.pc_main_lifts_3x10(exercises);

-- The helper is only needed for this one-off update.
DROP FUNCTION public.pc_main_lifts_3x10(jsonb);

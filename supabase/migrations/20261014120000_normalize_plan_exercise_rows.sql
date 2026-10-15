-- Normalize malformed workout-plan exercise rows (QA 13 Oct 2026, bug #3).
--
-- Before the editor stored sets/reps/weight as separate structured inputs,
-- bad imports/edits left two kinds of corruption in the `exercises` JSON of
-- default_workout_plans and user_workout_plans (both are one-row-per-day with
-- `exercises` = a flat array of {name, sets, reps, suggestedWeight, ...}):
--
--   * A kg weight typed into the `reps` field of a *weighted* lift, with the
--     weight slot wrongly reading "Bodyweight" (e.g. Hip Thrust
--     reps:"20" / suggestedWeight:"Bodyweight", Romanian deadlift reps:"40").
--   * Empty `reps`, which rendered as "3 ×" (e.g. Goblet Squats).
--
-- This backfill fixes only those clear cases. It is conservative and
-- idempotent — re-running it is a no-op, and the WHERE clauses skip rows that
-- don't change.
--
-- SAFETY / DRY RUN: to preview affected rows before applying, run the two
-- UPDATEs as SELECTs first, e.g.
--   SELECT id, day_index, exercises,
--          public.normalize_plan_exercises(exercises) AS fixed
--   FROM public.user_workout_plans
--   WHERE exercises IS DISTINCT FROM public.normalize_plan_exercises(exercises);
-- (create the function first, then DROP it, or just inspect inside a
-- transaction with ROLLBACK).

CREATE OR REPLACE FUNCTION public.normalize_plan_exercises(exercises jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  ex jsonb;
  nm text;
  sw_txt text;
  weighted boolean;
BEGIN
  IF exercises IS NULL OR jsonb_typeof(exercises) <> 'array' THEN
    RETURN exercises;
  END IF;

  FOR ex IN SELECT value FROM jsonb_array_elements(exercises) AS value
  LOOP
    -- Pass through anything that isn't an exercise object untouched.
    IF jsonb_typeof(ex) <> 'object' THEN
      result := result || jsonb_build_array(ex);
      CONTINUE;
    END IF;

    nm := lower(btrim(coalesce(ex->>'name', '')));
    sw_txt := lower(btrim(coalesce(ex->>'suggestedWeight', '')));

    -- Known kg-based (weighted) lifts, incl. the common misspellings/plurals
    -- the normalizer collapses elsewhere. Only these are eligible for the
    -- "weight landed in reps" fix, so bodyweight/cardio moves are never touched.
    weighted := nm IN (
      'goblet squat', 'goblet squats', 'squat', 'squats', 'barbell squat',
      'hip thrust', 'hip thrusts', 'cable kickbacks',
      'romanian deadlift', 'romanian deadlifts', 'deadlift', 'deadlifts', 'rdl', 'rdls',
      'lat pulldown', 'dumbbell shoulder press', 'seated row', 'cable row',
      'back extension', 'leg extension', 'leg extensions',
      'reverse lunge', 'reverse lunges', 'smith machine lunges', 'step ups',
      'kettlebell swings'
    );

    -- Rule A: weight-in-reps on a weighted lift whose weight slot is blank or
    -- "Bodyweight"/"BW". Move the number to suggestedWeight as kg, reset reps to
    -- the app default (10), and clear the bogus bodyweight flag. The > 15 guard
    -- means a plausible rep count (<= 15) is never mistaken for a weight.
    IF weighted
       AND sw_txt IN ('', 'bodyweight', 'bw')
       AND (ex->>'reps') ~ '^[0-9]+(\.[0-9]+)?$'
    THEN
      IF (ex->>'reps')::numeric > 15 THEN
        ex := jsonb_set(ex, '{suggestedWeight}', to_jsonb((ex->>'reps') || ' kg'));
        ex := jsonb_set(ex, '{reps}', to_jsonb('10'::text));
        ex := ex - 'isBodyweight';
      END IF;
    END IF;

    -- Rule B: empty/whitespace reps → default to "10" (so it no longer renders
    -- as "3 ×"). Reads reps fresh so it also covers anything Rule A left empty.
    IF btrim(coalesce(ex->>'reps', '')) = '' THEN
      ex := jsonb_set(ex, '{reps}', to_jsonb('10'::text), true);
    END IF;

    result := result || jsonb_build_array(ex);
  END LOOP;

  RETURN result;
END;
$$;

-- Apply to the admin default plan...
UPDATE public.default_workout_plans
SET exercises = public.normalize_plan_exercises(exercises)
WHERE exercises IS DISTINCT FROM public.normalize_plan_exercises(exercises);

-- ...and to every user's custom plan.
UPDATE public.user_workout_plans
SET exercises = public.normalize_plan_exercises(exercises)
WHERE exercises IS DISTINCT FROM public.normalize_plan_exercises(exercises);

-- The helper is only needed for this one-off backfill.
DROP FUNCTION public.normalize_plan_exercises(jsonb);

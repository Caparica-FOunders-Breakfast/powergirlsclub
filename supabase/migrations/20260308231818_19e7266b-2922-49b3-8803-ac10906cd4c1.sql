
-- Function to recalculate weekly score for a user/week
CREATE OR REPLACE FUNCTION public.recalculate_weekly_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_week_start date;
  v_total_points integer := 0;
  v_streak integer := 0;
  v_max_streak integer := 0;
  v_day integer;
  v_day_total integer;
  v_day_completed integer;
  v_team_id uuid;
  v_completed_days integer := 0;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_week_start := COALESCE(NEW.week_start, OLD.week_start);

  -- Loop through each day (0-6) and check if all exercises are completed
  FOR v_day IN 0..6 LOOP
    SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
    INTO v_day_total, v_day_completed
    FROM public.exercise_logs
    WHERE user_id = v_user_id
      AND week_start = v_week_start
      AND day_index = v_day;

    IF v_day_total > 0 AND v_day_total = v_day_completed THEN
      -- Day fully completed: 10 points
      v_total_points := v_total_points + 10;
      v_completed_days := v_completed_days + 1;
      v_streak := v_streak + 1;
      IF v_streak > v_max_streak THEN
        v_max_streak := v_streak;
      END IF;
    ELSE
      v_streak := 0;
    END IF;
  END LOOP;

  -- Streak bonus: +2 points for each consecutive day beyond the first
  IF v_max_streak > 1 THEN
    v_total_points := v_total_points + ((v_max_streak - 1) * 2);
  END IF;

  -- Get user's team
  SELECT team_id INTO v_team_id
  FROM public.profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  -- Upsert the weekly score
  INSERT INTO public.weekly_scores (user_id, week_start, points, streak, team_id)
  VALUES (v_user_id, v_week_start, v_total_points, v_max_streak, v_team_id)
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    points = EXCLUDED.points,
    streak = EXCLUDED.streak,
    team_id = EXCLUDED.team_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_scores_user_week_unique'
  ) THEN
    ALTER TABLE public.weekly_scores ADD CONSTRAINT weekly_scores_user_week_unique UNIQUE (user_id, week_start);
  END IF;
END $$;

-- Create trigger on exercise_logs
DROP TRIGGER IF EXISTS trg_recalculate_weekly_score ON public.exercise_logs;
CREATE TRIGGER trg_recalculate_weekly_score
  AFTER INSERT OR UPDATE OR DELETE ON public.exercise_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_weekly_score();

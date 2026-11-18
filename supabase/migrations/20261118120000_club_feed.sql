-- Club feed + challenges (power-club-club-feed brief).
--
-- New:
--   workout_sessions  one row per finished workout (member, week, day). Counts
--                     "workouts this week" and team points. Exercise logs only
--                     record ticks, so they can't tell a finished day apart
--                     from a half-done one on their own.
--   feed_posts        workout / new_best / streak / joined posts
--   feed_cheers       one cheer per member per post
--   profiles          feed_share, feed_show_weights
--
-- Privacy: profiles are readable by every member today (that includes body
-- weight), so the feed never reads them from the client. Everything the club
-- sees goes through the SECURITY DEFINER functions below, which return only a
-- first name, an initial and an avatar colour, never email, body weight or
-- strength level. When a member hides their weights, the kg are removed on the
-- server, not just hidden in the UI.
--
-- Safe to re-run.

-- ── profiles ───────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feed_share boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feed_show_weights boolean NOT NULL DEFAULT true;

-- ── workout_sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  day_index integer NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  day_name text,
  minutes integer CHECK (minutes IS NULL OR minutes BETWEEN 1 AND 600),
  finished_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, day_index)
);
CREATE INDEX IF NOT EXISTS workout_sessions_week_idx ON public.workout_sessions (week_start);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workout_sessions_own_select" ON public.workout_sessions;
CREATE POLICY "workout_sessions_own_select" ON public.workout_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "workout_sessions_own_insert" ON public.workout_sessions;
CREATE POLICY "workout_sessions_own_insert" ON public.workout_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "workout_sessions_own_update" ON public.workout_sessions;
CREATE POLICY "workout_sessions_own_update" ON public.workout_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "workout_sessions_own_delete" ON public.workout_sessions;
CREATE POLICY "workout_sessions_own_delete" ON public.workout_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Backfill the last 5 weeks from exercise logs: a day counts as finished when
-- every logged exercise is ticked and at least as many are ticked as the plan
-- has for that day. Rest and recovery check-ins don't count.
INSERT INTO public.workout_sessions (user_id, week_start, day_index, day_name, finished_at)
SELECT l.user_id, l.week_start, l.day_index, p.label, COALESCE(max(l.completed_at), max(l.updated_at), now())
FROM public.exercise_logs l
LEFT JOIN public.user_workout_plans p ON p.user_id = l.user_id AND p.day_index = l.day_index
WHERE l.week_start >= (date_trunc('week', now())::date - 28)
  AND l.exercise_name NOT IN ('Rest Day', 'Recovery Day')
  AND l.day_index BETWEEN 0 AND 6
GROUP BY l.user_id, l.week_start, l.day_index, p.label, p.exercises
HAVING count(*) = count(*) FILTER (WHERE l.completed)
   AND count(*) FILTER (WHERE l.completed) >= GREATEST(1, COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p.exercises) = 'array' THEN p.exercises END), 1))
ON CONFLICT (user_id, week_start, day_index) DO NOTHING;

-- ── feed_posts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('workout', 'new_best', 'streak', 'joined')),
  workout_id uuid REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  week_start date,
  day_index integer,
  day_name text,
  week_number integer,
  readiness text CHECK (readiness IS NULL OR readiness IN ('ready', 'so_so', 'not_ready')),
  show_weights boolean NOT NULL DEFAULT true,
  note text CHECK (note IS NULL OR char_length(note) <= 140),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  hidden boolean NOT NULL DEFAULT false,
  -- One post per workout / streak week / sign-up: 'workout:2026-11-16:2',
  -- 'streak:2026-11-16', 'joined'.
  dedupe_key text NOT NULL,
  has_best boolean GENERATED ALWAYS AS (
    kind = 'new_best' OR jsonb_path_exists(payload, '$.lifts[*] ? (@.is_new_best == true)')
  ) STORED,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS feed_posts_created_idx ON public.feed_posts (created_at DESC, id DESC) WHERE NOT hidden;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_posts_select" ON public.feed_posts;
CREATE POLICY "feed_posts_select" ON public.feed_posts FOR SELECT TO authenticated
  USING (NOT hidden OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "feed_posts_own_insert" ON public.feed_posts;
CREATE POLICY "feed_posts_own_insert" ON public.feed_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT hidden);
DROP POLICY IF EXISTS "feed_posts_own_delete" ON public.feed_posts;
CREATE POLICY "feed_posts_own_delete" ON public.feed_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "feed_posts_admin_update" ON public.feed_posts;
CREATE POLICY "feed_posts_admin_update" ON public.feed_posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notes: trim, strip links, max 140 characters, empty becomes null.
CREATE OR REPLACE FUNCTION public.feed_clean_note()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF NEW.note IS NOT NULL THEN
    v := NEW.note;
    v := regexp_replace(v, '(https?://|www\.)\S*', '', 'gi');
    v := regexp_replace(v, '\m[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|pt|co|app|me|ly|link|gg|xyz|info|biz|site|online|shop|store|tv|uk|es|fr|de|br)\M(/\S*)?', '', 'gi');
    v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
    NEW.note := NULLIF(left(v, 140), '');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS feed_posts_clean_note ON public.feed_posts;
CREATE TRIGGER feed_posts_clean_note BEFORE INSERT OR UPDATE OF note ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.feed_clean_note();

-- ── feed_cheers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_cheers (
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.feed_cheers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feed_cheers_own_select" ON public.feed_cheers;
CREATE POLICY "feed_cheers_own_select" ON public.feed_cheers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "feed_cheers_own_insert" ON public.feed_cheers;
CREATE POLICY "feed_cheers_own_insert" ON public.feed_cheers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "feed_cheers_own_delete" ON public.feed_cheers;
CREATE POLICY "feed_cheers_own_delete" ON public.feed_cheers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── helpers ────────────────────────────────────────────────────────────────
-- First name only. Emails used as a placeholder name become "Member".
CREATE OR REPLACE FUNCTION public.club_first_name(_display_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _display_name IS NULL OR btrim(_display_name) = '' OR _display_name LIKE '%@%' THEN 'Member'
    ELSE split_part(btrim(_display_name), ' ', 1)
  END
$$;

-- Remove kg from a post payload (weights hidden).
CREATE OR REPLACE FUNCTION public.club_strip_weights(_payload jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN jsonb_typeof(_payload->'lifts') = 'array' THEN
      jsonb_set(_payload, '{lifts}', COALESCE((
        SELECT jsonb_agg(l - 'weight_kg' - 'previous_best_kg' ORDER BY ord)
        FROM jsonb_array_elements(_payload->'lifts') WITH ORDINALITY AS t(l, ord)
      ), '[]'::jsonb))
    ELSE _payload - 'weight_kg' - 'previous_kg'
  END
$$;

-- ── club_feed: newest first, 20 at a time ──────────────────────────────────
DROP FUNCTION IF EXISTS public.club_feed(timestamptz, integer, boolean);
CREATE OR REPLACE FUNCTION public.club_feed(_before timestamptz DEFAULT NULL, _limit integer DEFAULT 20, _bests_only boolean DEFAULT false)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  kind text,
  day_name text,
  week_number integer,
  readiness text,
  show_weights boolean,
  note text,
  payload jsonb,
  has_best boolean,
  author_name text,
  author_color text,
  cheer_count integer,
  cheered boolean,
  is_mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.created_at, p.kind, p.day_name, p.week_number, p.readiness, p.show_weights, p.note,
    CASE WHEN p.show_weights OR p.user_id = auth.uid() THEN p.payload ELSE public.club_strip_weights(p.payload) END,
    p.has_best,
    public.club_first_name(pr.display_name),
    COALESCE(pr.avatar_color, '#E8308C'),
    (SELECT count(*)::int FROM public.feed_cheers c WHERE c.post_id = p.id),
    EXISTS (SELECT 1 FROM public.feed_cheers c WHERE c.post_id = p.id AND c.user_id = auth.uid()),
    p.user_id = auth.uid()
  FROM public.feed_posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE auth.uid() IS NOT NULL
    AND NOT p.hidden
    AND (_before IS NULL OR p.created_at < _before)
    AND (NOT _bests_only OR p.has_best)
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50)
$$;

-- ── club_week_stats: whole club, Monday to Sunday ──────────────────────────
DROP FUNCTION IF EXISTS public.club_week_stats(date);
CREATE OR REPLACE FUNCTION public.club_week_stats(_week_start date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bests AS (
    SELECT p.user_id, p.show_weights, l AS lift, p.created_at
    FROM public.feed_posts p
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.payload->'lifts') = 'array' THEN p.payload->'lifts' ELSE '[]'::jsonb END) AS l
    WHERE NOT p.hidden AND p.kind = 'workout'
      AND p.created_at >= _week_start AND p.created_at < _week_start + 7
      AND (l->>'is_new_best')::boolean IS TRUE
    UNION ALL
    SELECT p.user_id, p.show_weights, p.payload, p.created_at
    FROM public.feed_posts p
    WHERE NOT p.hidden AND p.kind = 'new_best'
      AND p.created_at >= _week_start AND p.created_at < _week_start + 7
  )
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE jsonb_build_object(
    'workouts', (SELECT count(*) FROM public.workout_sessions s WHERE s.week_start = _week_start),
    'members', (SELECT count(DISTINCT s.user_id) FROM public.workout_sessions s WHERE s.week_start = _week_start),
    'bests', (SELECT count(*) FROM bests),
    'top_bests', COALESCE((
      SELECT jsonb_agg(x ORDER BY (x->>'weight_kg')::numeric DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'first_name', public.club_first_name(pr.display_name),
          'exercise', b.lift->>'name',
          'weight_kg', CASE WHEN b.show_weights OR b.user_id = auth.uid() THEN b.lift->'weight_kg' ELSE NULL END
        ) AS x
        FROM bests b
        LEFT JOIN public.profiles pr ON pr.user_id = b.user_id
        ORDER BY CASE WHEN b.show_weights THEN (b.lift->>'weight_kg')::numeric END DESC NULLS LAST, b.created_at DESC
        LIMIT 5
      ) t
    ), '[]'::jsonb)
  ) END
$$;

-- ── club_team_week: your team, the team ranking and your teammates ─────────
-- Points: each finished workout this week = 1. Teammates' progress counts
-- their planned training days, not 7 days a week.
DROP FUNCTION IF EXISTS public.club_team_week(date);
CREATE OR REPLACE FUNCTION public.club_team_week(_week_start date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT pr.team_id FROM public.profiles pr WHERE pr.user_id = auth.uid() AND pr.team_id IS NOT NULL LIMIT 1
  ),
  team_points AS (
    SELECT t.id, t.name, count(s.id)::int AS points
    FROM public.teams t
    JOIN public.profiles pr ON pr.team_id = t.id
    LEFT JOIN public.workout_sessions s ON s.user_id = pr.user_id AND s.week_start = _week_start
    GROUP BY t.id, t.name
  ),
  mates AS (
    SELECT
      pr.user_id,
      public.club_first_name(pr.display_name) AS first_name,
      (SELECT count(*)::int FROM public.workout_sessions s WHERE s.user_id = pr.user_id AND s.week_start = _week_start) AS done,
      (SELECT count(*)::int FROM public.user_workout_plans w
        WHERE w.user_id = pr.user_id AND w.day_index BETWEEN 0 AND 6
          AND NOT w.is_rest AND NOT w.is_recovery
          AND jsonb_typeof(w.exercises) = 'array' AND jsonb_array_length(w.exercises) > 0) AS planned
    FROM public.profiles pr, me
    WHERE pr.team_id = me.team_id
  )
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM me) THEN NULL ELSE jsonb_build_object(
    'team', (SELECT jsonb_build_object('id', t.id, 'name', t.name, 'code', t.team_code) FROM public.teams t, me WHERE t.id = me.team_id),
    'standings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('team_id', tp.id, 'name', tp.name, 'points', tp.points, 'is_mine', tp.id = (SELECT team_id FROM me))
        ORDER BY tp.points DESC, tp.name)
      FROM team_points tp
    ), '[]'::jsonb),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('first_name', m.first_name, 'done', m.done, 'planned', m.planned, 'is_me', m.user_id = auth.uid())
        ORDER BY (m.user_id = auth.uid()) DESC, m.done DESC, m.first_name)
      FROM mates m
    ), '[]'::jsonb)
  ) END
$$;

-- ── Admin: every post, hidden ones included ────────────────────────────────
DROP FUNCTION IF EXISTS public.club_admin_posts(integer);
CREATE OR REPLACE FUNCTION public.club_admin_posts(_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, created_at timestamptz, kind text, day_name text, note text, hidden boolean, author_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.created_at, p.kind, p.day_name, p.note, p.hidden, public.club_first_name(pr.display_name)
  FROM public.feed_posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 200)
$$;

REVOKE ALL ON FUNCTION public.club_feed(timestamptz, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_week_stats(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_team_week(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_admin_posts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_feed(timestamptz, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_week_stats(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_team_week(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_admin_posts(integer) TO authenticated;

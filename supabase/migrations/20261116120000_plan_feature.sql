-- Training plan feature (step 1): exercise library, recommended plan
-- templates, and the member plan header. Generated from plans-data.json
-- (design source of truth). Idempotent: safe to re-run.
--
-- tracking is inferred (not in the source); see the ship note for the
-- few judgement calls (med ball throws, farmer carry, bike sprints).

CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('power','strength','core','sprint')),
  muscles text,
  tracking text NOT NULL DEFAULT 'weights' CHECK (tracking IN ('weights','bodyweight','time','assisted','rounds')),
  easier_option text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_per_week int NOT NULL UNIQUE CHECK (days_per_week IN (2,3,4)),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.plan_template_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  position int NOT NULL,
  name text NOT NULL,
  power_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  UNIQUE (template_id, position)
);

CREATE TABLE IF NOT EXISTS public.plan_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.plan_template_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  position int NOT NULL,
  sets int,
  reps_or_time text,
  UNIQUE (day_id, position)
);

CREATE TABLE IF NOT EXISTS public.member_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'recommended' CHECK (source IN ('recommended','ai_import','custom')),
  days_per_week int NOT NULL DEFAULT 3 CHECK (days_per_week IN (2,3,4)),
  training_days text[] NOT NULL DEFAULT ARRAY['Mon','Wed','Fri'],
  base_mode text NOT NULL DEFAULT 'auto' CHECK (base_mode IN ('auto','manual')),
  started_at date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: library + templates are readable by any signed-in member; writes are
-- admin-only. member_plans is owner-only.
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exercises_read" ON public.exercises;
CREATE POLICY "exercises_read" ON public.exercises FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "exercises_admin_write" ON public.exercises;
CREATE POLICY "exercises_admin_write" ON public.exercises FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_templates_read" ON public.plan_templates;
CREATE POLICY "plan_templates_read" ON public.plan_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "plan_templates_admin_write" ON public.plan_templates;
CREATE POLICY "plan_templates_admin_write" ON public.plan_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.plan_template_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_template_days_read" ON public.plan_template_days;
CREATE POLICY "plan_template_days_read" ON public.plan_template_days FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "plan_template_days_admin_write" ON public.plan_template_days;
CREATE POLICY "plan_template_days_admin_write" ON public.plan_template_days FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.plan_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_template_items_read" ON public.plan_template_items;
CREATE POLICY "plan_template_items_read" ON public.plan_template_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "plan_template_items_admin_write" ON public.plan_template_items;
CREATE POLICY "plan_template_items_admin_write" ON public.plan_template_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.member_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "member_plans_owner" ON public.member_plans;
CREATE POLICY "member_plans_owner" ON public.member_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Exercise library -------------------------------------------------------
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Jump squats', 'power', 'Legs, glutes', 'bodyweight', 'Squat to calf raise', 'https://www.youtube.com/watch?v=JwCaCql7VpQ') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Med ball chest throws', 'power', 'Chest, shoulders', 'bodyweight', 'Lighter ball', 'https://www.youtube.com/watch?v=VFyQExZjs70') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Kettlebell swings', 'power', 'Glutes, hamstrings', 'weights', 'Light kettlebell, hip hinge drill', 'https://www.youtube.com/watch?v=yeB_J0rqc5Q') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Pogo jumps', 'power', 'Calves, ankles', 'bodyweight', 'Fewer reps', 'https://www.youtube.com/watch?v=8VddB27UkY4') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Box jumps', 'power', 'Legs, glutes', 'bodyweight', 'Low box or step ups', 'https://www.youtube.com/watch?v=v9cZQqGX1Xk') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Lateral bounds', 'power', 'Legs, glutes, balance', 'bodyweight', 'Small hops, stick each landing', 'https://www.youtube.com/watch?v=soqQy4dzEts') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Bike sprints', 'sprint', 'Heart, legs', 'rounds', 'Fewer rounds', 'https://www.youtube.com/watch?v=_O5MX9WI9ms') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Barbell squat', 'strength', 'Legs, glutes', 'weights', 'Goblet squat', 'https://www.youtube.com/watch?v=QLbMsabhBqY') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Dumbbell Romanian deadlift', 'strength', 'Hamstrings, glutes', 'weights', 'Lighter dumbbells', 'https://www.youtube.com/watch?v=hQgFixeXdZo') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Hip thrust', 'strength', 'Glutes', 'weights', 'Glute bridge', 'https://www.youtube.com/watch?v=qFxTNOiQIAU') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Bulgarian split squat', 'strength', 'Legs, glutes', 'weights', 'Bodyweight split squat', 'https://www.youtube.com/watch?v=Ozv-OPuVw6A') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Plank', 'core', 'Core', 'time', 'Plank on knees', 'https://www.youtube.com/watch?v=mwlp75MS6Rg') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Dumbbell shoulder press', 'strength', 'Shoulders', 'weights', 'Seated, lighter', 'https://www.youtube.com/watch?v=0JfYxMRsUCQ') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Single-arm dumbbell row', 'strength', 'Back', 'weights', 'Lighter dumbbell', 'https://www.youtube.com/watch?v=yMtKjtfK1PM') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Dumbbell pullover', 'strength', 'Lats, chest', 'weights', 'Lighter dumbbell', 'https://www.youtube.com/watch?v=QZlxP3evaOY') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Push ups', 'strength', 'Chest, triceps', 'bodyweight', 'Push ups on knees or a bench', 'https://www.youtube.com/watch?v=WDIpL0pjun0') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Dead bug', 'core', 'Deep core', 'bodyweight', 'Legs only', 'https://www.youtube.com/watch?v=bxn9FBrt4-A') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Assisted pull ups', 'strength', 'Back, biceps', 'assisted', 'Thicker band', 'https://www.youtube.com/watch?v=4yE-XGDWJPg') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Goblet squat', 'strength', 'Legs, glutes', 'weights', 'Bodyweight squat', 'https://www.youtube.com/watch?v=nfX7IFK9UNI') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Dumbbell bench press', 'strength', 'Chest, triceps', 'weights', 'Push ups', 'https://www.youtube.com/watch?v=bVCsBdAv8SQ') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Farmer carry', 'strength', 'Grip, core', 'time', 'Lighter weights, shorter walk', 'https://www.youtube.com/watch?v=8OtwXwrJizk') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;
INSERT INTO public.exercises (name, type, muscles, tracking, easier_option, video_url) VALUES ('Copenhagen plank', 'core', 'Inner thighs, core', 'time', 'Knee on the bench instead of the foot', 'https://www.youtube.com/watch?v=TH7B8ppYXOc') ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, muscles=EXCLUDED.muscles, tracking=EXCLUDED.tracking, easier_option=EXCLUDED.easier_option, video_url=EXCLUDED.video_url;

-- Recommended plan templates --------------------------------------------
INSERT INTO public.plan_templates (days_per_week, name) VALUES (2, '2-day week') ON CONFLICT (days_per_week) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.plan_templates (days_per_week, name) VALUES (3, '3-day week') ON CONFLICT (days_per_week) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.plan_templates (days_per_week, name) VALUES (4, '4-day week') ON CONFLICT (days_per_week) DO UPDATE SET name=EXCLUDED.name;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 0, 'Full body A', (SELECT id FROM public.exercises WHERE name='Jump squats') FROM public.plan_templates t WHERE t.days_per_week=2
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Barbell squat'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell shoulder press'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Single-arm dumbbell row'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Hip thrust'), 3, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Plank'), 4, 3, '40 sec'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Bike sprints'), 5, 4, 'rounds'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 1, 'Full body B', (SELECT id FROM public.exercises WHERE name='Kettlebell swings') FROM public.plan_templates t WHERE t.days_per_week=2
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell Romanian deadlift'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Assisted pull ups'), 1, 3, '8'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Bulgarian split squat'), 2, 3, '8 each leg'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Push ups'), 3, 3, '8'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Copenhagen plank'), 4, 3, '20 sec each side'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Bike sprints'), 5, 4, 'rounds'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=2 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 0, 'Lower body', (SELECT id FROM public.exercises WHERE name='Jump squats') FROM public.plan_templates t WHERE t.days_per_week=3
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Barbell squat'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell Romanian deadlift'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Hip thrust'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Bulgarian split squat'), 3, 3, '8 each leg'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Plank'), 4, 3, '40 sec'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 1, 'Upper body + core', (SELECT id FROM public.exercises WHERE name='Med ball chest throws') FROM public.plan_templates t WHERE t.days_per_week=3
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell shoulder press'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Single-arm dumbbell row'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell pullover'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Push ups'), 3, 3, '8'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dead bug'), 4, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 2, 'Full body', (SELECT id FROM public.exercises WHERE name='Kettlebell swings') FROM public.plan_templates t WHERE t.days_per_week=3
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Assisted pull ups'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Goblet squat'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell bench press'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Farmer carry'), 3, 3, '40 sec'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Copenhagen plank'), 4, 3, '20 sec each side'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=3 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 0, 'Lower body', (SELECT id FROM public.exercises WHERE name='Jump squats') FROM public.plan_templates t WHERE t.days_per_week=4
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Barbell squat'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell Romanian deadlift'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Hip thrust'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Bulgarian split squat'), 3, 3, '8 each leg'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Plank'), 4, 3, '40 sec'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=0
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 1, 'Sprints + jumps', NULL FROM public.plan_templates t WHERE t.days_per_week=4
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Bike sprints'), 0, NULL, '6–8 rounds'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Pogo jumps'), 1, 3, '5'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Box jumps'), 2, 3, '5'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Lateral bounds'), 3, 3, '5 each side'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=1
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 2, 'Upper body + core', (SELECT id FROM public.exercises WHERE name='Med ball chest throws') FROM public.plan_templates t WHERE t.days_per_week=4
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell shoulder press'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Single-arm dumbbell row'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell pullover'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Push ups'), 3, 3, '8'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dead bug'), 4, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=2
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;

INSERT INTO public.plan_template_days (template_id, position, name, power_exercise_id)
  SELECT t.id, 3, 'Full body', (SELECT id FROM public.exercises WHERE name='Kettlebell swings') FROM public.plan_templates t WHERE t.days_per_week=4
  ON CONFLICT (template_id, position) DO UPDATE SET name=EXCLUDED.name, power_exercise_id=EXCLUDED.power_exercise_id;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Assisted pull ups'), 0, 4, '6'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=3
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Goblet squat'), 1, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=3
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Dumbbell bench press'), 2, 3, '10'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=3
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Farmer carry'), 3, 3, '40 sec'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=3
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;
INSERT INTO public.plan_template_items (day_id, exercise_id, position, sets, reps_or_time)
  SELECT d.id, (SELECT id FROM public.exercises WHERE name='Copenhagen plank'), 4, 3, '20 sec each side'
  FROM public.plan_template_days d JOIN public.plan_templates t ON d.template_id=t.id
  WHERE t.days_per_week=4 AND d.position=3
  ON CONFLICT (day_id, position) DO UPDATE SET exercise_id=EXCLUDED.exercise_id, sets=EXCLUDED.sets, reps_or_time=EXCLUDED.reps_or_time;


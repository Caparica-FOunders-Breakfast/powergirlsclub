-- Create default_workout_plans table
CREATE TABLE public.default_workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_index integer NOT NULL UNIQUE CHECK (day_index >= 0 AND day_index <= 6),
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '',
  is_rest boolean NOT NULL DEFAULT false,
  is_recovery boolean NOT NULL DEFAULT false,
  rest_note text,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_workout_plans ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated can view default plans"
ON public.default_workout_plans FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert default plans"
ON public.default_workout_plans FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update default plans"
ON public.default_workout_plans FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete default plans"
ON public.default_workout_plans FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_default_workout_plans_updated_at
  BEFORE UPDATE ON public.default_workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current hardcoded defaults
INSERT INTO public.default_workout_plans (day_index, label, emoji, is_rest, is_recovery, rest_note, exercises) VALUES
(0, 'Lower Body', '🦵', false, false, NULL, '[{"name":"Goblet Squat","sets":3,"reps":"10","suggestedWeight":"14–20 kg","progression":"+2 to 2.5 kg/week"},{"name":"Romanian Deadlift","sets":3,"reps":"10","suggestedWeight":"20–30 kg","progression":"+2 to 2.5 kg"},{"name":"Smith Machine Lunges","sets":3,"reps":"10 each leg","suggestedWeight":"20–30 kg","progression":"+2 to 2.5 kg"},{"name":"Hip Thrust","sets":3,"reps":"10","suggestedWeight":"40–55 kg","progression":"+2 to 2.5 kg"},{"name":"Plank","sets":3,"reps":"40 sec","suggestedWeight":"Bodyweight","progression":"Increase time","isBodyweight":true,"isTimeBased":true}]'::jsonb),
(1, 'Rest', '🧘', true, false, 'Light walk or mobility. Recovery day.', '[]'::jsonb),
(2, 'Upper Body + Core', '💪', false, false, NULL, '[{"name":"Lat Pulldown","sets":3,"reps":"10","suggestedWeight":"25–35 kg","progression":"+2 to 2.5 kg"},{"name":"Dumbbell Shoulder Press","sets":3,"reps":"10","suggestedWeight":"6–8 kg","progression":"+1 to 2 kg"},{"name":"Seated Row","sets":3,"reps":"10","suggestedWeight":"25–30 kg","progression":"+2 to 2.5 kg"},{"name":"Push Ups","sets":3,"reps":"10","suggestedWeight":"Bodyweight","progression":"Add reps","isBodyweight":true},{"name":"Dead Bug","sets":3,"reps":"10","suggestedWeight":"Bodyweight","progression":"Slow controlled movement","isBodyweight":true},{"name":"Side Plank","sets":3,"reps":"30 sec each side","suggestedWeight":"Bodyweight","progression":"Increase time","isBodyweight":true,"isTimeBased":true}]'::jsonb),
(3, 'Power / HIIT', '⚡', false, false, NULL, '[{"name":"Kettlebell Swings","sets":3,"reps":"10","suggestedWeight":"12–16 kg","progression":"+2 kg"},{"name":"Box Jumps","sets":3,"reps":"10","suggestedWeight":"Bodyweight","progression":"Increase height","isBodyweight":true},{"name":"Battle Ropes","sets":3,"reps":"20 sec","suggestedWeight":"—","progression":"Increase intensity","isTimeBased":true},{"name":"Bike Sprint (20s all-in + 3min rest)","sets":3,"reps":"4 rounds","suggestedWeight":"4 rounds","progression":"+1 round/week","isRoundsBased":true}]'::jsonb),
(4, 'Lower Body', '🦵', false, false, NULL, '[{"name":"Barbell Squat","sets":3,"reps":"10","suggestedWeight":"30–40 kg","progression":"+2 to 2.5 kg"},{"name":"Hip Thrust","sets":3,"reps":"10","suggestedWeight":"45–60 kg","progression":"+2 to 5 kg"},{"name":"Step Ups","sets":3,"reps":"10 each leg","suggestedWeight":"10 kg dumbbells","progression":"+2 kg"},{"name":"Cable Kickbacks","sets":3,"reps":"10","suggestedWeight":"Moderate","progression":"Increase load"},{"name":"Hanging Knee Raises","sets":3,"reps":"10","suggestedWeight":"Bodyweight","progression":"Add reps","isBodyweight":true}]'::jsonb),
(5, 'Core + Back', '🔥', false, false, NULL, '[{"name":"Back Extension","sets":3,"reps":"10","suggestedWeight":"BW or 5 kg","progression":"+2 kg"},{"name":"Cable Row","sets":3,"reps":"10","suggestedWeight":"25–35 kg","progression":"+2 to 2.5 kg"},{"name":"Russian Twists","sets":3,"reps":"10","suggestedWeight":"6–10 kg","progression":"+2 kg"},{"name":"Bird Dog","sets":3,"reps":"10","suggestedWeight":"Bodyweight","progression":"Slow controlled","isBodyweight":true},{"name":"Farmer Carry","sets":3,"reps":"40 sec","suggestedWeight":"10–16 kg/hand","progression":"Increase weight"}]'::jsonb),
(6, 'Recovery', '🌿', false, true, 'Walk • Stretch • Sauna. Focus on recovery.', '[]'::jsonb);
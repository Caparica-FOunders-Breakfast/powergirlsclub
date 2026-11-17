-- Recommended plans: Barbell squat, Dumbbell shoulder press, Push ups and
-- Assisted pull ups are 3 sets of 10 in every template (they were 4x6 or 3x8).
-- 3x10 matches the week 1 base test ("3 rounds of 10, reps 8 to 10
-- challenging"), so the test and the plan use the same numbers.
-- Only the templates change; plans members already saved are left as they are.
UPDATE public.plan_template_items AS i
SET sets = 3, reps_or_time = '10'
FROM public.exercises AS e
WHERE i.exercise_id = e.id
  AND e.name IN ('Barbell squat', 'Dumbbell shoulder press', 'Push ups', 'Assisted pull ups');

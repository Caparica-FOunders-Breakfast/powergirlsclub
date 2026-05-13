-- Admin read policies so the /users dashboard can query everyone's
-- preferences and saved workout plans directly from the browser.
-- The profiles table is already readable by every authenticated user,
-- and exercise_logs got an admin SELECT policy in 20260513130000.
CREATE POLICY "Admins can read all user preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can read all user workout plans"
  ON public.user_workout_plans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

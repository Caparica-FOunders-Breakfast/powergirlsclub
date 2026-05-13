-- Feature flags consumed by useFeatureFlags(). Defaults are all-on so the
-- app keeps working until an admin flips a flag from the dashboard.
INSERT INTO public.app_settings (key, value) VALUES
  ('language_enabled', 'true'::jsonb),
  ('meals_enabled', 'true'::jsonb),
  ('signups_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- The admin dashboard needs to aggregate workouts across all users.
-- Allow admins to read every exercise log (RLS still blocks regular users).
CREATE POLICY "Admins can read all exercise logs"
  ON public.exercise_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

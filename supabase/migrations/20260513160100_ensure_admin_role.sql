-- Make sure klaracmuchova@gmail.com always has the admin role, regardless
-- of signup order. The original one-shot grant (20260511120000_*) only
-- runs against rows in auth.users that existed at the time the migration
-- was applied — if the admin user signed up after that, they end up with
-- no role and every admin-gated RLS check (e.g. app_settings writes from
-- the feature-flag toggles) fails silently.
--
-- This migration does two things:
--   1. Re-runs the grant for the current set of users (idempotent).
--   2. Adds a trigger on auth.users so any future signup with that email
--      gets the role automatically.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'klaracmuchova@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_admin_role_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'klaracmuchova@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_grant_admin_role ON auth.users;
CREATE TRIGGER auto_grant_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_admin_role_on_signup();

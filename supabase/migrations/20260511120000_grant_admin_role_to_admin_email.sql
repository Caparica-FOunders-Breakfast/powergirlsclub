-- Grant admin role to the designated admin email.
-- Idempotent via UNIQUE(user_id, role) on public.user_roles.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'klaracmuchova@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Track whether the user is on the default plan or has customized/imported
-- one. Null/empty = default (and the admin dashboard treats it as such).
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS plan_type TEXT
  CHECK (plan_type IS NULL OR plan_type IN ('default', 'custom'));

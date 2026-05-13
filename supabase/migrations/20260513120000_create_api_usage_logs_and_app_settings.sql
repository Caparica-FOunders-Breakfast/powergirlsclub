-- Backing tables for the AI workout-plan import feature.
--
-- api_usage_logs: append-only telemetry, one row per AI call. The edge
-- function writes via the service_role key, so we don't need broad insert
-- policies; users only need to read their own rows for client-side rate
-- limit display, and admins read all rows for the usage dashboard.
--
-- app_settings: key/value flags managed by admins (e.g. ai_import_enabled).
-- Authenticated users can read so the UI can render a graceful "disabled"
-- state; only admins can write.

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_logs_user_created_idx
  ON public.api_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_logs_created_idx
  ON public.api_usage_logs (created_at DESC);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api usage"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all api usage"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_app_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_app_settings_updated_at();

INSERT INTO public.app_settings (key, value)
VALUES ('ai_import_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

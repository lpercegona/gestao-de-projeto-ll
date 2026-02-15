
-- 1. Add auto-report columns to clients
ALTER TABLE public.clients
  ADD COLUMN auto_report_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN auto_report_day integer NOT NULL DEFAULT 1,
  ADD COLUMN auto_report_hour integer NOT NULL DEFAULT 9,
  ADD COLUMN auto_report_minute integer NOT NULL DEFAULT 0,
  ADD COLUMN auto_report_last_sent timestamptz;

-- 2. Create smtp_settings table
CREATE TABLE public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass text NOT NULL DEFAULT '',
  smtp_from_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Master admin can manage all
CREATE POLICY "Master admin can manage all smtp settings"
  ON public.smtp_settings FOR ALL
  USING (is_master_admin(auth.uid()));

-- Admin can manage own smtp settings
CREATE POLICY "Admin can manage own smtp settings"
  ON public.smtp_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Unique constraint: one record per owner (NULL for global)
CREATE UNIQUE INDEX smtp_settings_owner_unique ON public.smtp_settings (owner_id) WHERE owner_id IS NOT NULL;
CREATE UNIQUE INDEX smtp_settings_global_unique ON public.smtp_settings ((true)) WHERE owner_id IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_smtp_settings_updated_at
  BEFORE UPDATE ON public.smtp_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

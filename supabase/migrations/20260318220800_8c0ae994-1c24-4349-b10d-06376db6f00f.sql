
-- Create service_catalog table
CREATE TABLE public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  service text NOT NULL,
  description text DEFAULT '',
  hours numeric NOT NULL DEFAULT 0,
  price_per_hour numeric NOT NULL DEFAULT 0,
  image_url text,
  billing_type text NOT NULL DEFAULT 'unique',
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- Admin manages own catalog
CREATE POLICY "Admin can manage own catalog" ON public.service_catalog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Master admin full access
CREATE POLICY "Master admin full access" ON public.service_catalog
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Clients can view catalog from their admin (owner)
CREATE POLICY "Clients can view owner catalog" ON public.service_catalog
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND owner_id = (
      SELECT c.owner_id FROM clients c
      WHERE c.id = get_user_client_id(auth.uid())
    )
    AND is_active = true
  );

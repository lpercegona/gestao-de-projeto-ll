
-- Table for custom metrics configuration
CREATE TABLE public.report_custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label text NOT NULL,
  entity_type text NOT NULL DEFAULT 'projects',
  category_source text NOT NULL DEFAULT 'status',
  category_field_id uuid NULL,
  category_value text NOT NULL,
  display_type text NOT NULL DEFAULT 'count',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL
);

ALTER TABLE public.report_custom_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage own client metrics" ON public.report_custom_metrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

CREATE POLICY "Master admin can manage all metrics" ON public.report_custom_metrics
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()));

CREATE POLICY "Clients can view own metrics" ON public.report_custom_metrics
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client') AND client_id = get_user_client_id(auth.uid()));

-- RPC for shared reports
CREATE OR REPLACE FUNCTION public.get_shared_report_custom_metrics(p_token text)
  RETURNS TABLE(
    metric_id uuid,
    label text,
    entity_type text,
    category_source text,
    category_field_id uuid,
    category_value text,
    display_type text,
    sort_order integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS metric_id,
    m.label,
    m.entity_type,
    m.category_source,
    m.category_field_id,
    m.category_value,
    m.display_type,
    m.sort_order
  FROM report_custom_metrics m
  JOIN report_shares rs ON rs.client_id = m.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true
  ORDER BY m.sort_order ASC;
END;
$$;

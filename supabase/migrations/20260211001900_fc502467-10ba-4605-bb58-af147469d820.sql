CREATE OR REPLACE FUNCTION public.get_shared_report_requests(p_token text)
RETURNS TABLE (
  request_id uuid,
  request_type text,
  title text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  deadline date,
  admin_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    'project'::text,
    pr.title,
    pr.briefing,
    pr.status,
    pr.created_at,
    pr.updated_at,
    pr.desired_deadline,
    pr.admin_notes
  FROM project_requests pr
  JOIN report_shares rs ON rs.client_id = pr.client_id
  WHERE rs.share_token = p_token AND rs.is_public = true

  UNION ALL

  SELECT
    er.id,
    COALESCE(er.proposed_data->>'request_type', 'edit')::text,
    COALESCE(er.proposed_data->>'title', 'Solicitacao de edicao')::text,
    COALESCE(er.proposed_data->>'description', '')::text,
    er.status,
    er.created_at,
    er.updated_at,
    NULL::date,
    er.admin_notes
  FROM edit_requests er
  JOIN report_shares rs ON rs.client_id = er.client_id
  WHERE rs.share_token = p_token AND rs.is_public = true

  ORDER BY created_at DESC;
END;
$$;
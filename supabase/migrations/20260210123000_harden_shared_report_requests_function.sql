-- Harden and fix shared report requests RPC
-- 1) compare token as text (report_shares.share_token is text)
-- 2) avoid leaking function execution to PUBLIC role
CREATE OR REPLACE FUNCTION public.get_shared_report_requests(p_token text)
RETURNS TABLE(
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shared_client AS (
    SELECT rs.client_id
    FROM report_shares rs
    WHERE rs.share_token = p_token
      AND rs.is_public = true
  )
  SELECT
    pr.id AS request_id,
    'new_project'::text AS request_type,
    pr.title,
    pr.briefing AS description,
    pr.status,
    pr.created_at,
    pr.updated_at,
    pr.desired_deadline::date AS deadline,
    NULL::text AS admin_notes
  FROM project_requests pr
  JOIN shared_client sc ON sc.client_id = pr.client_id

  UNION ALL

  SELECT
    er.id AS request_id,
    COALESCE(er.proposed_data->>'request_type', 'edit_project') AS request_type,
    CASE COALESCE(er.proposed_data->>'request_type', 'edit_project')
      WHEN 'new_task' THEN 'Solicitação de nova tarefa'
      WHEN 'edit_task' THEN 'Solicitação de edição de tarefa'
      WHEN 'edit_project' THEN 'Solicitação de edição de projeto'
      ELSE 'Solicitação de edição'
    END AS title,
    COALESCE(
      er.proposed_data->>'task_name',
      er.proposed_data->>'name',
      er.proposed_data->>'description'
    ) AS description,
    er.status,
    er.created_at,
    er.updated_at,
    NULL::date AS deadline,
    er.admin_notes
  FROM edit_requests er
  JOIN shared_client sc ON sc.client_id = er.client_id;
$$;

REVOKE ALL ON FUNCTION public.get_shared_report_requests(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_report_requests(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_report_requests(text) TO authenticated;

-- Drop existing function first (return type structure changes)
DROP FUNCTION IF EXISTS public.get_shared_report_projects(text);

-- Recreate get_shared_report_projects without due_date column
CREATE OR REPLACE FUNCTION public.get_shared_report_projects(p_token text)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_status text,
  custom_fields jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    p.custom_fields
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  JOIN report_shares rs ON rs.client_id = c.id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$$;
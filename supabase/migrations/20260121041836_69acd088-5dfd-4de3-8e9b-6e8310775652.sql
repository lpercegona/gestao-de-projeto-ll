-- Create function to get project columns for shared report
CREATE OR REPLACE FUNCTION public.get_shared_report_project_columns(p_token text)
RETURNS TABLE (
  column_id uuid,
  column_name text,
  column_type text,
  column_options text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pc.id as column_id,
    pc.name as column_name,
    pc.type as column_type,
    pc.options as column_options
  FROM project_columns pc
  JOIN report_shares rs ON pc.client_id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
$$;

-- Update get_shared_report_projects to include custom_fields
DROP FUNCTION IF EXISTS public.get_shared_report_projects(text);

CREATE OR REPLACE FUNCTION public.get_shared_report_projects(p_token text)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_status text,
  custom_fields jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    p.custom_fields as custom_fields
  FROM projects p
  JOIN report_shares rs ON p.client_id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
$$;
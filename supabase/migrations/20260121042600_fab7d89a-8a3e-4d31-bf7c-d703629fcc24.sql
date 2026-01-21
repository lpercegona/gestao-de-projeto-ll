-- Drop existing functions first to allow changing return types
DROP FUNCTION IF EXISTS public.get_client_portal_tasks(text);
DROP FUNCTION IF EXISTS public.get_shared_report_tasks(text);
DROP FUNCTION IF EXISTS public.get_client_portal_projects(text);
DROP FUNCTION IF EXISTS public.get_shared_report_projects(text);

-- Recreate RPC function to include due_date in client portal tasks
CREATE FUNCTION public.get_client_portal_tasks(p_token text)
RETURNS TABLE (
  task_id uuid,
  project_id uuid,
  task_name text,
  task_description text,
  task_status text,
  task_due_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.project_id,
    t.name as task_name,
    t.description as task_description,
    t.status as task_status,
    t.due_date as task_due_date
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  WHERE c.access_token = p_token;
END;
$$;

-- Recreate RPC function to include due_date in shared report tasks
CREATE FUNCTION public.get_shared_report_tasks(p_token text)
RETURNS TABLE (
  task_id uuid,
  project_id uuid,
  task_name text,
  task_description text,
  task_due_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.project_id,
    t.name as task_name,
    t.description as task_description,
    t.due_date as task_due_date
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  JOIN report_shares rs ON rs.client_id = c.id
  WHERE rs.share_token = p_token;
END;
$$;

-- Recreate RPC function to include due_date in client portal projects
CREATE FUNCTION public.get_client_portal_projects(p_token text)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_description text,
  project_status text,
  project_due_date date,
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
    p.description as project_description,
    p.status as project_status,
    p.due_date as project_due_date,
    p.custom_fields
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  WHERE c.access_token = p_token;
END;
$$;

-- Recreate RPC function to include due_date in shared report projects
CREATE FUNCTION public.get_shared_report_projects(p_token text)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_status text,
  project_due_date date,
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
    p.due_date as project_due_date,
    p.custom_fields
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  JOIN report_shares rs ON rs.client_id = c.id
  WHERE rs.share_token = p_token;
END;
$$;
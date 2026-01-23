-- Drop existing functions first (return type changed)
DROP FUNCTION IF EXISTS public.get_shared_report_tasks(text);
DROP FUNCTION IF EXISTS public.get_shared_report_time_entries(text);

-- Recreate get_shared_report_tasks without due_date column
CREATE OR REPLACE FUNCTION public.get_shared_report_tasks(p_token text)
RETURNS TABLE (
  task_id uuid,
  project_id uuid,
  task_name text,
  task_description text
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
    t.description as task_description
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  JOIN report_shares rs ON rs.client_id = c.id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$$;

-- Recreate get_shared_report_time_entries with description field
CREATE OR REPLACE FUNCTION public.get_shared_report_time_entries(p_token text)
RETURNS TABLE (
  entry_id uuid,
  task_id uuid,
  hours numeric,
  entry_date date,
  entry_type text,
  entry_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.id as entry_id,
    te.task_id,
    te.hours,
    te.date as entry_date,
    te.entry_type,
    te.description as entry_description
  FROM time_entries te
  JOIN tasks t ON te.task_id = t.id
  JOIN projects p ON t.project_id = p.id
  JOIN report_shares rs ON p.client_id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$$;
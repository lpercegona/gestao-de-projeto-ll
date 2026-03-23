DROP FUNCTION IF EXISTS public.get_shared_report_tasks(text);

CREATE OR REPLACE FUNCTION public.get_shared_report_tasks(p_token text)
 RETURNS TABLE(task_id uuid, project_id uuid, task_name text, task_description text, task_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.project_id,
    t.name as task_name,
    t.description as task_description,
    t.status as task_status
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  JOIN report_shares rs ON rs.client_id = c.id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$function$;
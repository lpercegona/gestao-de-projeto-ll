-- Drop existing function (might have text parameter)
DROP FUNCTION IF EXISTS public.get_shared_report_time_entries(text);

-- Recreate with entry_type included
CREATE OR REPLACE FUNCTION public.get_shared_report_time_entries(p_token text)
RETURNS TABLE (
  entry_id uuid,
  task_id uuid,
  hours numeric,
  entry_date date,
  entry_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    te.id as entry_id,
    te.task_id,
    te.hours,
    te.date as entry_date,
    te.entry_type
  FROM time_entries te
  JOIN tasks t ON te.task_id = t.id
  JOIN projects p ON t.project_id = p.id
  JOIN report_shares rs ON p.client_id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
$$;
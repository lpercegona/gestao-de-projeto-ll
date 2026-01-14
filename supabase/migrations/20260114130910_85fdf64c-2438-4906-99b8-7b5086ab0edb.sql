-- Create a secure function to get client portal data without exposing access_token via RLS
-- This function validates the token and returns client data only if valid
CREATE OR REPLACE FUNCTION public.get_client_portal_data(p_token text)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_email text,
  contracted_hours integer,
  password_set boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.contracted_hours,
    c.password_set
  FROM clients c
  WHERE c.access_token = p_token;
END;
$$;

-- Grant execute permission to anon (unauthenticated users)
GRANT EXECUTE ON FUNCTION public.get_client_portal_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_data(text) TO authenticated;

-- Create a secure function for admins to retrieve access tokens
-- Only master_admin and admin users who own the client can get the token
CREATE OR REPLACE FUNCTION public.get_client_access_token(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_owner_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Get client owner and token
  SELECT c.access_token, c.owner_id 
  INTO v_token, v_owner_id
  FROM clients c
  WHERE c.id = p_client_id;
  
  -- Check if user is master_admin
  IF public.is_master_admin(v_user_id) THEN
    RETURN v_token;
  END IF;
  
  -- Check if user is admin and owns this client
  IF public.is_admin_or_master(v_user_id) AND v_owner_id = v_user_id THEN
    RETURN v_token;
  END IF;
  
  -- Not authorized
  RETURN NULL;
END;
$$;

-- Only authenticated users can call this
GRANT EXECUTE ON FUNCTION public.get_client_access_token(uuid) TO authenticated;

-- Create a function to get projects for a portal token (for unauthenticated access)
CREATE OR REPLACE FUNCTION public.get_client_portal_projects(p_token text)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_description text,
  project_status text,
  custom_fields jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Get client_id from token
  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.access_token = p_token;
  
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.status,
    p.custom_fields
  FROM projects p
  WHERE p.client_id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_portal_projects(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_projects(text) TO authenticated;

-- Create a function to get tasks for portal projects
CREATE OR REPLACE FUNCTION public.get_client_portal_tasks(p_token text)
RETURNS TABLE (
  task_id uuid,
  task_name text,
  task_description text,
  task_status text,
  project_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Get client_id from token
  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.access_token = p_token;
  
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.status,
    t.project_id
  FROM tasks t
  INNER JOIN projects p ON t.project_id = p.id
  WHERE p.client_id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_portal_tasks(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_tasks(text) TO authenticated;

-- Create a function to get time entries for portal tasks
CREATE OR REPLACE FUNCTION public.get_client_portal_time_entries(p_token text)
RETURNS TABLE (
  entry_id uuid,
  task_id uuid,
  hours numeric,
  entry_date date,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Get client_id from token
  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.access_token = p_token;
  
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    te.id,
    te.task_id,
    te.hours,
    te.date,
    te.description
  FROM time_entries te
  INNER JOIN tasks t ON te.task_id = t.id
  INNER JOIN projects p ON t.project_id = p.id
  WHERE p.client_id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_portal_time_entries(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_time_entries(text) TO authenticated;
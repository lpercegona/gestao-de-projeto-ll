-- Create table for report sharing settings
CREATE TABLE public.report_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  share_token text NOT NULL DEFAULT (gen_random_uuid())::text UNIQUE,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Master admin can manage all shares
CREATE POLICY "Master admin can manage all report shares"
ON public.report_shares
FOR ALL
USING (is_master_admin(auth.uid()));

-- Admin can manage shares for their owned clients
CREATE POLICY "Admin can manage own client report shares"
ON public.report_shares
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = report_shares.client_id 
    AND c.owner_id = auth.uid()
  )
);

-- Client can manage their own report shares
CREATE POLICY "Clients can manage own report shares"
ON public.report_shares
FOR ALL
USING (
  has_role(auth.uid(), 'client'::app_role) AND 
  EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = report_shares.client_id 
    AND c.user_id = auth.uid()
  )
);

-- Anyone can read public shares (for public report viewing)
CREATE POLICY "Anyone can view public report shares"
ON public.report_shares
FOR SELECT
USING (is_public = true);

-- Function to get report by share token (for public access)
CREATE OR REPLACE FUNCTION public.get_shared_report(p_token text)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  contracted_hours integer,
  is_public boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.contracted_hours,
    rs.is_public
  FROM report_shares rs
  JOIN clients c ON c.id = rs.client_id
  WHERE rs.share_token = p_token AND rs.is_public = true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_shared_report TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_report TO authenticated;

-- Function to get projects for shared report
CREATE OR REPLACE FUNCTION public.get_shared_report_projects(p_token text)
RETURNS TABLE(
  project_id uuid,
  project_name text,
  project_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_is_public boolean;
BEGIN
  -- Get client_id from share token
  SELECT rs.client_id, rs.is_public INTO v_client_id, v_is_public
  FROM report_shares rs
  WHERE rs.share_token = p_token;
  
  -- Only return data if share is public
  IF v_is_public = true THEN
    RETURN QUERY
    SELECT p.id, p.name, p.status
    FROM projects p
    WHERE p.client_id = v_client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_report_projects TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_report_projects TO authenticated;

-- Function to get tasks for shared report
CREATE OR REPLACE FUNCTION public.get_shared_report_tasks(p_token text)
RETURNS TABLE(
  task_id uuid,
  task_name text,
  task_description text,
  project_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_is_public boolean;
BEGIN
  SELECT rs.client_id, rs.is_public INTO v_client_id, v_is_public
  FROM report_shares rs
  WHERE rs.share_token = p_token;
  
  IF v_is_public = true THEN
    RETURN QUERY
    SELECT t.id, t.name, t.description, t.project_id
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.client_id = v_client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_report_tasks TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_report_tasks TO authenticated;

-- Function to get time entries for shared report
CREATE OR REPLACE FUNCTION public.get_shared_report_time_entries(p_token text)
RETURNS TABLE(
  entry_id uuid,
  task_id uuid,
  hours numeric,
  entry_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_is_public boolean;
BEGIN
  SELECT rs.client_id, rs.is_public INTO v_client_id, v_is_public
  FROM report_shares rs
  WHERE rs.share_token = p_token;
  
  IF v_is_public = true THEN
    RETURN QUERY
    SELECT te.id, te.task_id, te.hours, te.date
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    WHERE p.client_id = v_client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_report_time_entries TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_report_time_entries TO authenticated;
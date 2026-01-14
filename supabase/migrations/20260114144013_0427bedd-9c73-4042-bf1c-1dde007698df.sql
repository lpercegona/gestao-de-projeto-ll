-- ==========================================
-- PART 1: Task Timers Table
-- ==========================================

-- Create task_timers table to track active timers
CREATE TABLE public.task_timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id) -- Only one timer per task at a time
);

-- Enable RLS for task_timers
ALTER TABLE public.task_timers ENABLE ROW LEVEL SECURITY;

-- RLS: Master admin can manage all timers
CREATE POLICY "Master admin can manage all timers"
ON public.task_timers
FOR ALL
USING (is_master_admin(auth.uid()));

-- RLS: Admin can manage timers on own project tasks
CREATE POLICY "Admin can manage own project timers"
ON public.task_timers
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_timers.task_id AND p.owner_id = auth.uid()
  )
);

-- RLS: Collaborator can manage timers on accessible project tasks
CREATE POLICY "Collaborator can manage accessible project timers"
ON public.task_timers
FOR ALL
USING (
  is_collaborator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN user_project_access upa ON upa.project_id = t.project_id
    WHERE t.id = task_timers.task_id AND upa.user_id = auth.uid() AND upa.can_edit = true
  )
);

-- ==========================================
-- PART 2: Project Requests Table
-- ==========================================

-- Create project_requests table for client project solicitations
CREATE TABLE public.project_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  briefing TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'converted')),
  admin_notes TEXT,
  converted_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for project_requests
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Master admin can manage all project requests
CREATE POLICY "Master admin can manage all project requests"
ON public.project_requests
FOR ALL
USING (is_master_admin(auth.uid()));

-- RLS: Admin can manage project requests for own clients
CREATE POLICY "Admin can manage own client project requests"
ON public.project_requests
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = project_requests.client_id AND c.owner_id = auth.uid()
  )
);

-- RLS: Clients can view and create their own project requests
CREATE POLICY "Clients can view own project requests"
ON public.project_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'client'::app_role) AND
  client_id = get_user_client_id(auth.uid())
);

CREATE POLICY "Clients can create own project requests"
ON public.project_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role) AND
  client_id = get_user_client_id(auth.uid()) AND
  created_by = auth.uid()
);

-- Trigger for updating updated_at
CREATE TRIGGER update_project_requests_updated_at
BEFORE UPDATE ON public.project_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- PART 3: Add share_password to report_shares
-- ==========================================

-- Add share_password column to report_shares
ALTER TABLE public.report_shares
ADD COLUMN share_password TEXT;

-- ==========================================
-- PART 4: RPC Function to verify report password
-- ==========================================

-- Function to verify report password
CREATE OR REPLACE FUNCTION public.verify_report_password(p_token TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_password TEXT;
  is_public_report BOOLEAN;
BEGIN
  -- Get the share record
  SELECT share_password, is_public INTO stored_password, is_public_report
  FROM report_shares
  WHERE share_token = p_token;
  
  -- If no record found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If report is not public, return false
  IF NOT is_public_report THEN
    RETURN FALSE;
  END IF;
  
  -- If no password set, allow access
  IF stored_password IS NULL OR stored_password = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Verify password
  RETURN stored_password = p_password;
END;
$$;

-- ==========================================
-- PART 5: RPC Function to check if report has password
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_report_has_password(p_token TEXT)
RETURNS TABLE(has_password BOOLEAN, is_public BOOLEAN, client_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (rs.share_password IS NOT NULL AND rs.share_password != '') AS has_password,
    rs.is_public,
    c.name AS client_name
  FROM report_shares rs
  JOIN clients c ON c.id = rs.client_id
  WHERE rs.share_token = p_token;
END;
$$;
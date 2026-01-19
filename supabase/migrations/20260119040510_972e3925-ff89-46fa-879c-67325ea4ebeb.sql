-- Add client_id column to project_columns to make custom fields client-specific
ALTER TABLE public.project_columns 
ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_project_columns_client_id ON public.project_columns(client_id);

-- Update RLS policies to respect client ownership
DROP POLICY IF EXISTS "Master admin can manage project columns" ON public.project_columns;
DROP POLICY IF EXISTS "Admin can manage project columns" ON public.project_columns;
DROP POLICY IF EXISTS "Collaborator can view project columns" ON public.project_columns;
DROP POLICY IF EXISTS "Clients can view project columns" ON public.project_columns;

-- Master admin can manage all columns
CREATE POLICY "Master admin can manage project columns" 
ON public.project_columns 
FOR ALL 
USING (is_master_admin(auth.uid()));

-- Admin can manage columns for their own clients
CREATE POLICY "Admin can manage project columns" 
ON public.project_columns 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = project_columns.client_id 
      AND c.owner_id = auth.uid()
    )
  )
);

-- Collaborator can view columns for accessible projects' clients
CREATE POLICY "Collaborator can view project columns" 
ON public.project_columns 
FOR SELECT 
USING (
  is_collaborator(auth.uid()) 
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_project_access upa ON upa.project_id = p.id
      WHERE p.client_id = project_columns.client_id 
      AND upa.user_id = auth.uid()
    )
  )
);

-- Clients can view their own columns
CREATE POLICY "Clients can view project columns" 
ON public.project_columns 
FOR SELECT 
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND (
    client_id IS NULL 
    OR client_id = get_user_client_id(auth.uid())
  )
);
-- Create a secure view for collaborators that excludes sensitive fields
CREATE VIEW public.clients_limited
WITH (security_invoker = false, security_barrier = true) AS
SELECT 
  id, name, company, contracted_hours, 
  contract_type, contract_start_date, contract_end_date, contract_months,
  pipeline_status, owner_id, created_by, created_at, updated_at, logo_url
FROM public.clients;

-- Grant access to the view
GRANT SELECT ON public.clients_limited TO authenticated;

-- Drop the existing collaborator policy that exposes all columns
DROP POLICY IF EXISTS "Collaborator can view clients of accessible projects" ON public.clients;

-- Create a restricted collaborator policy that denies direct table access
-- Collaborators should use clients_limited view or get data through project joins
CREATE POLICY "Collaborator can view clients of accessible projects" 
ON public.clients 
FOR SELECT 
USING (
  is_collaborator(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM projects p
    JOIN user_project_access upa ON upa.project_id = p.id
    WHERE p.client_id = clients.id AND upa.user_id = auth.uid()
  )
);
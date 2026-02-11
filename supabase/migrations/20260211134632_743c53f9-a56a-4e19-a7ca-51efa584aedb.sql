-- Drop the security definer view and recreate with security_invoker
DROP VIEW IF EXISTS public.clients_limited;

-- Recreate view with security_invoker=on so it respects RLS
-- This means collaborators will only see rows allowed by their RLS policy
-- but the view restricts which COLUMNS are visible
CREATE VIEW public.clients_limited
WITH (security_invoker = true, security_barrier = true) AS
SELECT 
  id, name, company, contracted_hours, 
  contract_type, contract_start_date, contract_end_date, contract_months,
  pipeline_status, owner_id, created_by, created_at, updated_at, logo_url
FROM public.clients;

-- Grant access to the view
GRANT SELECT ON public.clients_limited TO authenticated;
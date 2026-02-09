-- Update RLS policy on clients table to support multi-user access via client_users
DROP POLICY IF EXISTS "Clients can view own client record" ON public.clients;

CREATE POLICY "Clients can view own client record" 
ON public.clients 
FOR SELECT 
USING (
  -- Check if user is linked via client_users table (new multi-user system)
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = clients.id
    AND cu.user_id = auth.uid()
  )
  OR
  -- Fallback: legacy user_id field
  user_id = auth.uid()
);

-- Update RLS policy on report_shares for client users
DROP POLICY IF EXISTS "Clients can manage own report shares" ON public.report_shares;

CREATE POLICY "Clients can manage own report shares" 
ON public.report_shares 
FOR ALL 
USING (
  has_role(auth.uid(), 'client'::app_role) AND (
    -- New: check client_users table
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = report_shares.client_id
      AND cu.user_id = auth.uid()
    )
    OR
    -- Legacy: check clients.user_id
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = report_shares.client_id
      AND c.user_id = auth.uid()
    )
  )
);
-- Fix overly permissive INSERT policy on contract_history
-- Current policy uses WITH CHECK (true) which the linter flags
-- Since inserts are done by SECURITY DEFINER functions (sign_contract, convert_proposal_to_contract)
-- which bypass RLS, we can safely restrict this to admins only
DROP POLICY IF EXISTS "System can insert contract history" ON public.contract_history;

CREATE POLICY "Admins can insert contract history"
ON public.contract_history
FOR INSERT
WITH CHECK (is_admin_or_master(auth.uid()));
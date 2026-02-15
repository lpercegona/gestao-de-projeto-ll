
-- 1. PROPOSALS: Admin only sees own, master sees all
DROP POLICY IF EXISTS "Admins can manage proposals" ON public.proposals;
CREATE POLICY "Admin can manage own proposals"
  ON public.proposals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Master admin can manage all proposals"
  ON public.proposals FOR ALL
  USING (is_master_admin(auth.uid()));

-- 2. CONTRACTS: Admin only sees own, master sees all
DROP POLICY IF EXISTS "Admins can manage contracts" ON public.contracts;
CREATE POLICY "Admin can manage own contracts"
  ON public.contracts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Master admin can manage all contracts"
  ON public.contracts FOR ALL
  USING (is_master_admin(auth.uid()));

-- 3. PROPOSAL_TEMPLATES: Admin only sees own, master sees all
DROP POLICY IF EXISTS "Admins can manage templates" ON public.proposal_templates;
CREATE POLICY "Admin can manage own proposal templates"
  ON public.proposal_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Master admin can manage all proposal templates"
  ON public.proposal_templates FOR ALL
  USING (is_master_admin(auth.uid()));

-- 4. CONTRACT_TEMPLATES: Admin only sees own, master sees all
DROP POLICY IF EXISTS "Admins can manage contract templates" ON public.contract_templates;
CREATE POLICY "Admin can manage own contract templates"
  ON public.contract_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Master admin can manage all contract templates"
  ON public.contract_templates FOR ALL
  USING (is_master_admin(auth.uid()));

-- 5. EMAIL_TEMPLATES: Separate read (global) from write (owner-only)
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Anyone can read email templates" ON public.email_templates;

-- Global read for all authenticated (needed for fallback logic)
CREATE POLICY "Authenticated can read email templates"
  ON public.email_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin can insert/update/delete only own templates
CREATE POLICY "Admin can manage own email templates"
  ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Master admin full access
CREATE POLICY "Master admin can manage all email templates"
  ON public.email_templates FOR ALL
  USING (is_master_admin(auth.uid()));

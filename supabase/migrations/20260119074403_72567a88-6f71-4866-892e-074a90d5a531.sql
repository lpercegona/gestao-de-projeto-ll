-- =============================================
-- MIGRATION: Sales Pipeline + Contract System
-- =============================================

-- 1. Add pipeline fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

-- Create index for pipeline status
CREATE INDEX IF NOT EXISTS idx_clients_pipeline_status ON public.clients(pipeline_status);

-- 2. Add client_id to proposals for linking
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for client_id
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);

-- 3. Create contract_templates table
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contract_templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_templates
CREATE POLICY "Admins can manage contract templates"
ON public.contract_templates
FOR ALL
USING (is_admin_or_master(auth.uid()));

-- 4. Create contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  share_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  
  -- Contractor data (pre-filled from proposal)
  contractor_name TEXT NOT NULL,
  contractor_email TEXT NOT NULL,
  contractor_company TEXT,
  contractor_document TEXT,
  contractor_address TEXT,
  
  -- Contract data
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  services_summary JSONB DEFAULT '[]'::jsonb,
  total_hours NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  
  -- Dates and conditions
  start_date DATE,
  end_date DATE,
  payment_terms TEXT,
  
  -- Status and signatures
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signer_name TEXT,
  signer_ip TEXT,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies for contracts
CREATE POLICY "Admins can manage contracts"
ON public.contracts
FOR ALL
USING (is_admin_or_master(auth.uid()));

-- Create indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON public.contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_share_token ON public.contracts(share_token);

-- 5. Create contract_history table
CREATE TABLE IF NOT EXISTS public.contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contract_history
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_history
CREATE POLICY "Admins can view contract history"
ON public.contract_history
FOR SELECT
USING (is_admin_or_master(auth.uid()));

CREATE POLICY "System can insert contract history"
ON public.contract_history
FOR INSERT
WITH CHECK (true);

-- Create index for contract_history
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON public.contract_history(contract_id);

-- 6. Create function to get contract by token (for public access)
CREATE OR REPLACE FUNCTION public.get_contract_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  contractor_name TEXT,
  contractor_email TEXT,
  contractor_company TEXT,
  services_summary JSONB,
  total_hours NUMERIC,
  total_value NUMERIC,
  start_date DATE,
  end_date DATE,
  payment_terms TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update viewed_at if not already viewed
  UPDATE public.contracts c
  SET 
    viewed_at = COALESCE(c.viewed_at, now()),
    status = CASE WHEN c.status = 'sent' THEN 'viewed' ELSE c.status END
  WHERE c.share_token = p_token AND c.status IN ('sent', 'viewed');

  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.content,
    c.contractor_name,
    c.contractor_email,
    c.contractor_company,
    c.services_summary,
    c.total_hours,
    c.total_value,
    c.start_date,
    c.end_date,
    c.payment_terms,
    c.status,
    c.created_at
  FROM public.contracts c
  WHERE c.share_token = p_token;
END;
$$;

-- 7. Create function to sign contract
CREATE OR REPLACE FUNCTION public.sign_contract(
  p_token TEXT,
  p_signer_name TEXT,
  p_document TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_signer_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id UUID;
  v_old_status TEXT;
BEGIN
  -- Get contract and check if it can be signed
  SELECT c.id, c.status INTO v_contract_id, v_old_status
  FROM public.contracts c
  WHERE c.share_token = p_token AND c.status IN ('sent', 'viewed');
  
  IF v_contract_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update contract with signature
  UPDATE public.contracts
  SET 
    status = 'signed',
    signed_at = now(),
    signer_name = p_signer_name,
    signer_ip = p_signer_ip,
    contractor_document = COALESCE(p_document, contractor_document),
    contractor_address = COALESCE(p_address, contractor_address),
    updated_at = now()
  WHERE id = v_contract_id;
  
  -- Record history
  INSERT INTO public.contract_history (contract_id, old_status, new_status, notes)
  VALUES (v_contract_id, v_old_status, 'signed', 'Contrato assinado por: ' || p_signer_name);
  
  RETURN TRUE;
END;
$$;

-- 8. Create function to convert proposal to contract
CREATE OR REPLACE FUNCTION public.convert_proposal_to_contract(
  p_proposal_id UUID,
  p_template_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal RECORD;
  v_template_content TEXT := '';
  v_contract_id UUID;
BEGIN
  -- Get proposal data
  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  
  IF v_proposal IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada';
  END IF;
  
  -- Get template content if provided
  IF p_template_id IS NOT NULL THEN
    SELECT content INTO v_template_content FROM public.contract_templates WHERE id = p_template_id;
  END IF;
  
  -- Create contract
  INSERT INTO public.contracts (
    template_id,
    proposal_id,
    client_id,
    contractor_name,
    contractor_email,
    contractor_company,
    title,
    content,
    services_summary,
    total_hours,
    total_value,
    status,
    created_by
  ) VALUES (
    p_template_id,
    p_proposal_id,
    v_proposal.client_id,
    v_proposal.recipient_name,
    v_proposal.recipient_email,
    v_proposal.recipient_company,
    'Contrato - ' || v_proposal.title,
    COALESCE(v_template_content, ''),
    v_proposal.items,
    v_proposal.total_hours,
    v_proposal.total_value,
    'draft',
    v_proposal.created_by
  )
  RETURNING id INTO v_contract_id;
  
  -- Record history
  INSERT INTO public.contract_history (contract_id, new_status, notes)
  VALUES (v_contract_id, 'draft', 'Contrato criado a partir da proposta: ' || v_proposal.title);
  
  RETURN v_contract_id;
END;
$$;

-- 9. Create function to activate client when contract is signed
CREATE OR REPLACE FUNCTION public.activate_client_on_contract_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When contract is signed, activate the client
  IF NEW.status = 'signed' AND OLD.status != 'signed' AND NEW.client_id IS NOT NULL THEN
    UPDATE public.clients
    SET 
      pipeline_status = 'active',
      converted_at = now(),
      contracted_hours = COALESCE(contracted_hours, 0) + COALESCE(NEW.total_hours::integer, 0)
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contract signing
DROP TRIGGER IF EXISTS trigger_activate_client_on_sign ON public.contracts;
CREATE TRIGGER trigger_activate_client_on_sign
AFTER UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.activate_client_on_contract_sign();
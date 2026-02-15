
-- Drop functions that need return type changes
DROP FUNCTION IF EXISTS public.get_proposal_by_token(text, text);
DROP FUNCTION IF EXISTS public.sign_contract(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_contract_by_token(text);

-- Recreate get_proposal_by_token with template_sections
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text, p_email text DEFAULT NULL::text)
 RETURNS TABLE(proposal_id uuid, title text, description text, recipient_name text, recipient_email text, recipient_company text, items jsonb, total_hours numeric, total_value numeric, status text, valid_until date, created_at timestamp with time zone, template_content text, template_sections jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient_email text;
BEGIN
  IF p_email IS NOT NULL THEN
    SELECT p.recipient_email INTO v_recipient_email
    FROM proposals p
    WHERE p.share_token = p_token;
    IF v_recipient_email IS NULL OR lower(trim(v_recipient_email)) != lower(trim(p_email)) THEN
      RETURN;
    END IF;
  END IF;

  UPDATE proposals
  SET status = 'viewed', updated_at = now()
  WHERE share_token = p_token AND proposals.status = 'sent';

  RETURN QUERY
  SELECT
    p.id AS proposal_id, p.title, p.description,
    p.recipient_name, p.recipient_email, p.recipient_company,
    p.items, p.total_hours, p.total_value, p.status, p.valid_until, p.created_at,
    pt.description AS template_content,
    pt.sections AS template_sections
  FROM proposals p
  LEFT JOIN proposal_templates pt ON pt.id = p.template_id
  WHERE p.share_token = p_token;
END;
$function$;

-- Recreate sign_contract with signature type support
CREATE OR REPLACE FUNCTION public.sign_contract(
  p_token text,
  p_signer_name text,
  p_document text DEFAULT NULL::text,
  p_address text DEFAULT NULL::text,
  p_signer_ip text DEFAULT NULL::text,
  p_signature_type text DEFAULT 'client',
  p_signature_url text DEFAULT NULL::text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id UUID;
  v_old_status TEXT;
  v_admin_signed boolean;
  v_client_signed boolean;
BEGIN
  SELECT c.id, c.status INTO v_contract_id, v_old_status
  FROM public.contracts c
  WHERE c.share_token = p_token;
  
  IF v_contract_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_signature_type = 'admin' THEN
    UPDATE public.contracts
    SET admin_signature_url = p_signature_url, admin_signed_at = now(), updated_at = now()
    WHERE id = v_contract_id;
    INSERT INTO public.contract_history (contract_id, old_status, new_status, notes)
    VALUES (v_contract_id, v_old_status, v_old_status, 'Assinatura do admin: ' || p_signer_name);

  ELSIF p_signature_type = 'witness' THEN
    UPDATE public.contracts
    SET witness_signature_url = p_signature_url, witness_name = p_signer_name,
        witness_cpf = p_document, witness_ip = p_signer_ip, witness_signed_at = now(), updated_at = now()
    WHERE id = v_contract_id;
    INSERT INTO public.contract_history (contract_id, old_status, new_status, notes)
    VALUES (v_contract_id, v_old_status, v_old_status, 'Assinatura de testemunha: ' || p_signer_name);

  ELSE
    IF v_old_status NOT IN ('sent', 'viewed') THEN
      RETURN FALSE;
    END IF;
    UPDATE public.contracts
    SET client_signature_url = p_signature_url, client_signed_at = now(),
        signer_name = p_signer_name, signer_ip = p_signer_ip,
        contractor_document = COALESCE(p_document, contractor_document),
        contractor_address = COALESCE(p_address, contractor_address), updated_at = now()
    WHERE id = v_contract_id;
    INSERT INTO public.contract_history (contract_id, old_status, new_status, notes)
    VALUES (v_contract_id, v_old_status, v_old_status, 'Assinatura do cliente: ' || p_signer_name);
  END IF;

  SELECT (admin_signed_at IS NOT NULL), (client_signed_at IS NOT NULL)
  INTO v_admin_signed, v_client_signed
  FROM public.contracts WHERE id = v_contract_id;

  IF v_admin_signed AND v_client_signed THEN
    UPDATE public.contracts
    SET status = 'signed', signed_at = now(), updated_at = now()
    WHERE id = v_contract_id;
    INSERT INTO public.contract_history (contract_id, old_status, new_status, notes)
    VALUES (v_contract_id, v_old_status, 'signed', 'Contrato totalmente assinado');
  END IF;

  RETURN TRUE;
END;
$function$;

-- Recreate get_contract_by_token with signature data
CREATE OR REPLACE FUNCTION public.get_contract_by_token(p_token text)
 RETURNS TABLE(id uuid, title text, content text, contractor_name text, contractor_email text, contractor_company text, services_summary jsonb, total_hours numeric, total_value numeric, start_date date, end_date date, payment_terms text, status text, created_at timestamp with time zone, admin_signature_url text, client_signature_url text, witness_signature_url text, witness_name text, admin_signed_at timestamptz, client_signed_at timestamptz, witness_signed_at timestamptz, admin_company text, admin_cnpj text, admin_cpf text, admin_address text, contractor_cnpj text, contractor_cpf_responsavel text, contractor_document text, contractor_address text, signer_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.contracts c
  SET viewed_at = COALESCE(c.viewed_at, now()),
      status = CASE WHEN c.status = 'sent' THEN 'viewed' ELSE c.status END
  WHERE c.share_token = p_token AND c.status IN ('sent', 'viewed');

  RETURN QUERY
  SELECT c.id, c.title, c.content, c.contractor_name, c.contractor_email, c.contractor_company,
    c.services_summary, c.total_hours, c.total_value, c.start_date, c.end_date,
    c.payment_terms, c.status, c.created_at,
    c.admin_signature_url, c.client_signature_url, c.witness_signature_url,
    c.witness_name, c.admin_signed_at, c.client_signed_at, c.witness_signed_at,
    c.admin_company, c.admin_cnpj, c.admin_cpf, c.admin_address,
    c.contractor_cnpj, c.contractor_cpf_responsavel, c.contractor_document, c.contractor_address,
    c.signer_name
  FROM public.contracts c
  WHERE c.share_token = p_token;
END;
$function$;

-- Seed email template for contract_sent
INSERT INTO public.email_templates (slug, subject, body_html)
VALUES (
  'contract_sent',
  'Novo contrato: {{titulo_contrato}}',
  '<p>Olá {{nome_cliente}},</p><p>Você recebeu um novo contrato para análise e assinatura.</p><p><a href="{{link_contrato}}">Ver e assinar contrato</a></p>'
)
ON CONFLICT DO NOTHING;

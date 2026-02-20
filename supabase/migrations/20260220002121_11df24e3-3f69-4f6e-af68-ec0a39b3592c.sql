
DROP FUNCTION IF EXISTS public.get_contract_by_token(text);

CREATE OR REPLACE FUNCTION public.get_contract_by_token(p_token text)
 RETURNS TABLE(id uuid, title text, content text, contractor_name text, contractor_company text, services_summary jsonb, total_hours numeric, total_value numeric, start_date date, end_date date, payment_terms text, status text, created_at timestamp with time zone, admin_signature_url text, client_signature_url text, witness_signature_url text, witness_name text, admin_signed_at timestamp with time zone, client_signed_at timestamp with time zone, witness_signed_at timestamp with time zone, admin_company text, admin_cnpj text, admin_cpf text, admin_address text, contractor_cnpj text, contractor_cpf_responsavel text, contractor_document text, contractor_address text, signer_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow access to contracts that have been sent, viewed, or signed (NOT drafts)
  IF NOT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.share_token = p_token AND c.status IN ('sent', 'viewed', 'signed')
  ) THEN
    RETURN;
  END IF;

  UPDATE public.contracts c
  SET viewed_at = COALESCE(c.viewed_at, now()),
      status = CASE WHEN c.status = 'sent' THEN 'viewed' ELSE c.status END
  WHERE c.share_token = p_token AND c.status IN ('sent', 'viewed');

  RETURN QUERY
  SELECT c.id, c.title, c.content, c.contractor_name, c.contractor_company,
    c.services_summary, c.total_hours, c.total_value, c.start_date, c.end_date,
    c.payment_terms, c.status, c.created_at,
    c.admin_signature_url, c.client_signature_url, c.witness_signature_url,
    c.witness_name, c.admin_signed_at, c.client_signed_at, c.witness_signed_at,
    c.admin_company, c.admin_cnpj, c.admin_cpf, c.admin_address,
    c.contractor_cnpj, c.contractor_cpf_responsavel, c.contractor_document, c.contractor_address,
    c.signer_name
  FROM public.contracts c
  WHERE c.share_token = p_token AND c.status IN ('sent', 'viewed', 'signed');
END;
$function$;

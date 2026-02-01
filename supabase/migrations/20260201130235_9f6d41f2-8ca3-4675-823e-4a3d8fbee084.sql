-- Dropar função existente e recriá-la com nova assinatura
DROP FUNCTION IF EXISTS public.get_shared_report(text);

CREATE OR REPLACE FUNCTION public.get_shared_report(p_token text)
RETURNS TABLE(client_id uuid, client_name text, client_company text, client_logo_url text, contracted_hours integer, contract_type text, is_public boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.company as client_company,
    c.logo_url as client_logo_url,
    c.contracted_hours,
    c.contract_type,
    rs.is_public
  FROM report_shares rs
  JOIN clients c ON c.id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$$;
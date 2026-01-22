-- Add logo_url column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;

-- Update get_shared_report to include company name and logo
DROP FUNCTION IF EXISTS public.get_shared_report(text);
CREATE OR REPLACE FUNCTION public.get_shared_report(p_token text)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_company text,
  client_logo_url text,
  contracted_hours integer,
  is_public boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.company as client_company,
    c.logo_url as client_logo_url,
    c.contracted_hours,
    rs.is_public
  FROM report_shares rs
  JOIN clients c ON c.id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$$;
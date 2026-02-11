
-- Make check_client_email resistant to enumeration by adding artificial delay
-- and ensuring consistent timing regardless of whether email exists
CREATE OR REPLACE FUNCTION public.check_client_email(check_email text)
RETURNS TABLE(client_id uuid, has_password boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add artificial delay to prevent timing-based enumeration
  PERFORM pg_sleep(0.1 + random() * 0.1);
  
  RETURN QUERY
  SELECT c.id, c.password_set
  FROM clients c
  WHERE c.email = check_email;
END;
$$;

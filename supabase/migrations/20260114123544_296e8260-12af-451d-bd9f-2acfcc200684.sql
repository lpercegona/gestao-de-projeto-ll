-- Add password_set column to clients to track first-time login
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS password_set boolean NOT NULL DEFAULT false;

-- Create a function to check if a client exists by email
CREATE OR REPLACE FUNCTION public.check_client_email(check_email text)
RETURNS TABLE(client_id uuid, has_password boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.password_set
  FROM clients c
  WHERE c.email = check_email;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_client_email TO anon;
GRANT EXECUTE ON FUNCTION public.check_client_email TO authenticated;
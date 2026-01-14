-- Create a secure function to set up client account on first login
-- This function runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION public.setup_client_account(
  p_user_id uuid,
  p_client_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_owner_id uuid;
BEGIN
  -- Get the owner_id from the client record
  SELECT owner_id INTO v_client_owner_id
  FROM clients
  WHERE id = p_client_id;
  
  -- Insert user role as client
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'client')
  ON CONFLICT DO NOTHING;
  
  -- Insert profile for the client with the same owner_id as the client
  INSERT INTO profiles (user_id, email, owner_id)
  VALUES (p_user_id, p_email, v_client_owner_id)
  ON CONFLICT DO NOTHING;
  
  -- Update the client record to link user and mark password as set
  UPDATE clients
  SET user_id = p_user_id, password_set = true
  WHERE id = p_client_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_client_account TO authenticated;
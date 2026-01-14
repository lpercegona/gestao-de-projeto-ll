-- Fix critical vulnerability: Validate that p_client_id belongs to p_email
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
  v_client_email text;
BEGIN
  -- CRITICAL: Verify p_client_id matches the client with p_email
  SELECT owner_id, email INTO v_client_owner_id, v_client_email
  FROM clients
  WHERE id = p_client_id;
  
  -- Reject if client doesn't exist or email doesn't match
  IF v_client_email IS NULL OR lower(v_client_email) != lower(p_email) THEN
    RAISE EXCEPTION 'Invalid client credentials';
  END IF;
  
  -- Now safe to link user to verified client
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'client')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO profiles (user_id, email, owner_id)
  VALUES (p_user_id, p_email, v_client_owner_id)
  ON CONFLICT DO NOTHING;
  
  UPDATE clients
  SET user_id = p_user_id, password_set = true
  WHERE id = p_client_id AND lower(email) = lower(p_email);
  
  RETURN true;
END;
$$;
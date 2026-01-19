-- Create a function to sync client email with client_users table
CREATE OR REPLACE FUNCTION public.sync_client_email_to_users()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_existing_link_id uuid;
BEGIN
  -- Find if there's a user with this email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(NEW.email);
  
  IF v_user_id IS NOT NULL THEN
    -- Check if this user is already linked to this client
    SELECT id INTO v_existing_link_id
    FROM public.client_users
    WHERE client_id = NEW.id AND user_id = v_user_id;
    
    IF v_existing_link_id IS NULL THEN
      -- Check if there's any primary user for this client
      PERFORM 1 FROM public.client_users 
      WHERE client_id = NEW.id AND is_primary = true;
      
      -- Insert new link (primary if no primary exists)
      INSERT INTO public.client_users (client_id, user_id, is_primary, created_by)
      VALUES (NEW.id, v_user_id, NOT FOUND, NEW.created_by);
    END IF;
    
    -- Also update the clients.user_id field for backwards compatibility
    IF NEW.user_id IS NULL OR NEW.user_id != v_user_id THEN
      NEW.user_id := v_user_id;
    END IF;
  END IF;
  
  -- If email changed, handle old email user link
  IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
    -- Find user with old email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(OLD.email);
    
    -- Don't remove the link, just mark it as non-primary if it exists
    IF v_user_id IS NOT NULL THEN
      UPDATE public.client_users 
      SET is_primary = false 
      WHERE client_id = NEW.id 
        AND user_id = v_user_id 
        AND is_primary = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT and UPDATE on clients
DROP TRIGGER IF EXISTS sync_client_email_trigger ON public.clients;
CREATE TRIGGER sync_client_email_trigger
  BEFORE INSERT OR UPDATE OF email ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_email_to_users();

-- Sync existing clients that have user_id set but no client_users entry
INSERT INTO public.client_users (client_id, user_id, is_primary, created_by)
SELECT 
  c.id as client_id,
  c.user_id,
  true as is_primary,
  c.created_by
FROM public.clients c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_users cu 
    WHERE cu.client_id = c.id AND cu.user_id = c.user_id
  )
ON CONFLICT DO NOTHING;
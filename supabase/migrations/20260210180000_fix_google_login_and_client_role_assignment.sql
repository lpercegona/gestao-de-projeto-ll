-- Ensure OAuth (Google) sign-ins can resolve a valid role for pre-registered client emails.
-- When a new auth user is created, link by email to clients and assign client role when applicable.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  matched_client RECORD;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  SELECT COUNT(*) INTO user_count FROM auth.users;

  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'master_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id
    ) THEN
      IF EXISTS (
        SELECT 1 FROM public.clients c WHERE LOWER(c.email) = LOWER(NEW.email)
      ) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'client')
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END IF;
  END IF;

  FOR matched_client IN
    SELECT c.id, c.created_by
    FROM public.clients c
    WHERE LOWER(c.email) = LOWER(NEW.email)
  LOOP
    INSERT INTO public.client_users (client_id, user_id, is_primary, created_by)
    VALUES (
      matched_client.id,
      NEW.id,
      NOT EXISTS (
        SELECT 1
        FROM public.client_users cu
        WHERE cu.client_id = matched_client.id
          AND cu.is_primary = true
      ),
      matched_client.created_by
    )
    ON CONFLICT (client_id, user_id) DO NOTHING;

    UPDATE public.clients
    SET user_id = COALESCE(user_id, NEW.id)
    WHERE id = matched_client.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Backfill existing auth users that match a client email but still have no role.
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'client'::public.app_role
FROM auth.users au
JOIN public.clients c
  ON LOWER(c.email) = LOWER(au.email)
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Backfill user-client links for existing users by client email.
INSERT INTO public.client_users (client_id, user_id, is_primary, created_by)
SELECT
  c.id,
  au.id,
  NOT EXISTS (
    SELECT 1 FROM public.client_users cu2
    WHERE cu2.client_id = c.id
      AND cu2.is_primary = true
  ) AS is_primary,
  c.created_by
FROM public.clients c
JOIN auth.users au
  ON LOWER(c.email) = LOWER(au.email)
ON CONFLICT (client_id, user_id) DO NOTHING;

UPDATE public.clients c
SET user_id = au.id
FROM auth.users au
WHERE LOWER(c.email) = LOWER(au.email)
  AND c.user_id IS NULL;

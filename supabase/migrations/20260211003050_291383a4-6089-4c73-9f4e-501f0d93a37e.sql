
-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Drop the public SELECT policy that exposes passwords
DROP POLICY IF EXISTS "Anyone can view public report shares" ON public.report_shares;

-- 3. Create hash_report_password RPC for client-side use
CREATE OR REPLACE FUNCTION public.hash_report_password(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN extensions.crypt(p_password, extensions.gen_salt('bf', 10));
END;
$$;

GRANT EXECUTE ON FUNCTION public.hash_report_password TO authenticated;

-- 4. Update verify_report_password to use bcrypt comparison
CREATE OR REPLACE FUNCTION public.verify_report_password(p_token text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash TEXT;
  is_public_report BOOLEAN;
BEGIN
  SELECT share_password, is_public INTO stored_hash, is_public_report
  FROM report_shares
  WHERE share_token = p_token;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT is_public_report THEN RETURN FALSE; END IF;
  IF stored_hash IS NULL OR stored_hash = '' THEN RETURN TRUE; END IF;

  RETURN stored_hash = extensions.crypt(p_password, stored_hash);
END;
$$;

-- 5. Invalidate all existing plain-text passwords
UPDATE report_shares SET share_password = NULL WHERE share_password IS NOT NULL;

-- 6. Drop the permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

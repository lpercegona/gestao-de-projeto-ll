
-- 1. Tabela de configurações do link público de solicitação
CREATE TABLE public.request_link_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  share_token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.request_link_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage own request link settings"
ON public.request_link_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Master admin can manage all request link settings"
ON public.request_link_settings
FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_request_link_settings_updated_at
BEFORE UPDATE ON public.request_link_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Colunas extras em project_requests
ALTER TABLE public.project_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'authenticated',
  ADD COLUMN IF NOT EXISTS requester_email text,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_ip text;

-- 3. RPC: retorna info do link público por token
CREATE OR REPLACE FUNCTION public.get_public_request_link(p_token text)
RETURNS TABLE(owner_id uuid, is_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rls.owner_id, rls.is_enabled
  FROM public.request_link_settings rls
  WHERE rls.share_token = p_token AND rls.is_enabled = true;
$$;

-- 4. RPC: valida se e-mail está vinculado a algum cliente do owner desse token
CREATE OR REPLACE FUNCTION public.validate_request_email(p_token text, p_email text)
RETURNS TABLE(client_id uuid, client_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  -- Pequeno delay contra enumeration
  PERFORM pg_sleep(0.1 + random() * 0.1);

  SELECT rls.owner_id INTO v_owner_id
  FROM public.request_link_settings rls
  WHERE rls.share_token = p_token AND rls.is_enabled = true;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  -- Primeiro: e-mail direto na tabela clients
  RETURN QUERY
  SELECT c.id, c.name
  FROM public.clients c
  WHERE c.owner_id = v_owner_id
    AND lower(c.email) = v_email
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Depois: e-mail via client_users -> auth.users
  RETURN QUERY
  SELECT c.id, c.name
  FROM public.clients c
  JOIN public.client_users cu ON cu.client_id = c.id
  JOIN auth.users u ON u.id = cu.user_id
  WHERE c.owner_id = v_owner_id
    AND lower(u.email) = v_email
  LIMIT 1;
END;
$$;

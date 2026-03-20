
ALTER TABLE public.profiles
  ADD COLUMN public_profile_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN public_profile_slug text UNIQUE,
  ADD COLUMN cover_url text;

-- RPC: buscar perfil público por slug (sem autenticação)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_slug text)
RETURNS TABLE(full_name text, company_name text, avatar_url text, cover_url text, owner_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.full_name, p.company_name, p.avatar_url, p.cover_url, p.user_id AS owner_id
  FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
END;
$$;

-- RPC: buscar serviços ativos do perfil público
CREATE OR REPLACE FUNCTION public.get_public_profile_services(p_slug text)
RETURNS TABLE(id uuid, service text, description text, hours numeric, price_per_hour numeric, image_url text, billing_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner_id uuid;
BEGIN
  SELECT p.user_id INTO v_owner_id FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
  IF v_owner_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT sc.id, sc.service, sc.description, sc.hours, sc.price_per_hour, sc.image_url, sc.billing_type
  FROM service_catalog sc WHERE sc.owner_id = v_owner_id AND sc.is_active = true;
END;
$$;

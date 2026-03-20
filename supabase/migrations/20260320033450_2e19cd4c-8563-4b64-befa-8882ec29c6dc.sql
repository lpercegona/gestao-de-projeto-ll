
-- Add contact fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_contact_info boolean NOT NULL DEFAULT false;

-- Drop and recreate get_public_profile with new return type
DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(p_slug text)
RETURNS TABLE(full_name text, company_name text, avatar_url text, cover_url text, owner_id uuid, contact_email text, contact_phone text, show_contact_info boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.full_name, p.company_name, p.avatar_url, p.cover_url, p.user_id AS owner_id,
    p.contact_email, p.contact_phone, p.show_contact_info
  FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
END;
$$;

-- Drop and recreate get_public_portfolio_project with owner info
DROP FUNCTION IF EXISTS public.get_public_portfolio_project(text, uuid);
CREATE FUNCTION public.get_public_portfolio_project(p_slug text, p_project_id uuid)
RETURNS TABLE(id uuid, title text, description text, cover_url text, service_name text, owner_name text, owner_avatar text, owner_slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner_id uuid;
BEGIN
  SELECT p.user_id INTO v_owner_id FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
  IF v_owner_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pp.id, pp.title, pp.description, pp.cover_url, sc.service AS service_name,
    pr.full_name AS owner_name, pr.avatar_url AS owner_avatar, pr.public_profile_slug AS owner_slug
  FROM portfolio_projects pp
  LEFT JOIN service_catalog sc ON sc.id = pp.service_id
  JOIN profiles pr ON pr.user_id = pp.owner_id
  WHERE pp.id = p_project_id AND pp.owner_id = v_owner_id AND pp.is_visible = true;
END;
$$;

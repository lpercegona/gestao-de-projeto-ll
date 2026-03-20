
CREATE FUNCTION public.get_all_public_portfolio()
RETURNS TABLE(id uuid, title text, cover_url text, service_name text, owner_name text, owner_slug text, owner_avatar text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, pp.title, pp.cover_url, sc.service,
    p.full_name, p.public_profile_slug, p.avatar_url
  FROM portfolio_projects pp
  JOIN profiles p ON p.user_id = pp.owner_id
  LEFT JOIN service_catalog sc ON sc.id = pp.service_id
  WHERE pp.is_visible = true AND p.public_profile_enabled = true
  ORDER BY pp.created_at DESC;
END;
$$;

CREATE FUNCTION public.get_all_public_profiles()
RETURNS TABLE(full_name text, company_name text, avatar_url text, cover_url text, slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.full_name, p.company_name, p.avatar_url, p.cover_url, p.public_profile_slug
  FROM profiles p
  WHERE p.public_profile_enabled = true AND p.public_profile_slug IS NOT NULL
  ORDER BY p.full_name;
END;
$$;

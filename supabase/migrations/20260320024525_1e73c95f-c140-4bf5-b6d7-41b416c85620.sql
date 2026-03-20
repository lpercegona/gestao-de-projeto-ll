
-- Tabela de projetos do portfólio
CREATE TABLE public.portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  cover_url text,
  service_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage own portfolio" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

CREATE POLICY "Master admin full access portfolio" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Tabela de imagens do portfólio
CREATE TABLE public.portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage own portfolio images" ON public.portfolio_images
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolio_projects pp
    WHERE pp.id = portfolio_images.project_id AND pp.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolio_projects pp
    WHERE pp.id = portfolio_images.project_id AND pp.owner_id = auth.uid()
  ));

CREATE POLICY "Master admin full access portfolio images" ON public.portfolio_images
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload portfolio files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can update portfolio files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can delete portfolio files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portfolio');

CREATE POLICY "Public can view portfolio files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'portfolio');

-- RPC: portfólio público
CREATE FUNCTION public.get_public_portfolio(p_slug text)
RETURNS TABLE(id uuid, title text, description text, cover_url text, service_name text, is_visible boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner_id uuid;
BEGIN
  SELECT p.user_id INTO v_owner_id FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
  IF v_owner_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pp.id, pp.title, pp.description, pp.cover_url,
    sc.service AS service_name, pp.is_visible
  FROM portfolio_projects pp
  LEFT JOIN service_catalog sc ON sc.id = pp.service_id
  WHERE pp.owner_id = v_owner_id AND pp.is_visible = true
  ORDER BY pp.created_at DESC;
END;
$$;

-- RPC: imagens de projeto público
CREATE FUNCTION public.get_public_portfolio_images(p_slug text, p_project_id uuid)
RETURNS TABLE(id uuid, image_url text, sort_order integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner_id uuid;
BEGIN
  SELECT p.user_id INTO v_owner_id FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
  IF v_owner_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pi.id, pi.image_url, pi.sort_order
  FROM portfolio_images pi
  JOIN portfolio_projects pp ON pp.id = pi.project_id
  WHERE pp.id = p_project_id AND pp.owner_id = v_owner_id AND pp.is_visible = true
  ORDER BY pi.sort_order ASC;
END;
$$;

-- RPC: projeto individual público
CREATE FUNCTION public.get_public_portfolio_project(p_slug text, p_project_id uuid)
RETURNS TABLE(id uuid, title text, description text, cover_url text, service_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner_id uuid;
BEGIN
  SELECT p.user_id INTO v_owner_id FROM profiles p
  WHERE p.public_profile_slug = p_slug AND p.public_profile_enabled = true;
  IF v_owner_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pp.id, pp.title, pp.description, pp.cover_url, sc.service AS service_name
  FROM portfolio_projects pp
  LEFT JOIN service_catalog sc ON sc.id = pp.service_id
  WHERE pp.id = p_project_id AND pp.owner_id = v_owner_id AND pp.is_visible = true;
END;
$$;

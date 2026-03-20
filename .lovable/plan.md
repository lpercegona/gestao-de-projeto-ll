## Plano: Portfólio no módulo de Serviços + Perfil Público

### Resumo

Criar tabela `portfolio_projects` e `portfolio_images` no banco. Adicionar aba "Portfólio" no módulo de Serviços com CRUD completo. Exibir portfólio na página pública e criar página pública individual por projeto. 

---

### 1. Migration SQL

```sql
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

CREATE POLICY "Master admin full access" ON public.portfolio_projects
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

CREATE POLICY "Master admin full access images" ON public.portfolio_images
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- RPC para acesso público ao portfólio
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

-- RPC para buscar imagens de um projeto público
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

-- RPC para buscar projeto individual público
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
```

### 2. Storage

Criar bucket público `portfolio` para capas e imagens de portfólio:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);
```

Com políticas de upload para admins autenticados.

### 3. Novo arquivo: `src/components/services/PortfolioTab.tsx`

Componente com CRUD completo de projetos de portfólio:

- Listagem em grid de cards com capa, título, serviço vinculado e badge visível/oculto
- Botão "Novo Projeto" abre dialog com: título, descrição (textarea), upload de capa, select de serviço (opcional do `service_catalog`), upload de múltiplas imagens (listagem vertical com reordenação)
- Menu de ações por card: Editar, Ocultar/Apresentar (toggle `is_visible`), Excluir
- Upload de imagens ao bucket `portfolio`

### 4. Editar: `src/pages/Services.tsx`

- Adicionar `'portfolio'` ao tipo `ServicesTab` e ao `tabByPath` (`/portfolio`)
- Adicionar `<TabsTrigger value="portfolio">Portfólio</TabsTrigger>`
- Adicionar `<TabsContent value="portfolio"><PortfolioTab /></TabsContent>`

### 5. Editar: `src/App.tsx`

- Adicionar rota `/portfolio` apontando para `<Services />` (admin only)
- Adicionar rota pública `/:slug/:projecttitle` para página individual do projeto

### 6. Editar: `src/pages/PublicProfile.tsx`

- Buscar portfólio via RPC `get_public_portfolio`
- Exibir grid de 2 colunas (mobile) acima dos serviços: capa + título
- Cada item linkando para `/:slug/:projecttitle`

### 7. Novo arquivo: `src/pages/PublicPortfolioProject.tsx`

Página pública individual do projeto de portfólio:

- Busca dados via RPC `get_public_portfolio_project` e `get_public_portfolio_images`
- Layout: título, serviço vinculado, descrição, listagem vertical de imagens em alta resolução
- Link de volta ao perfil

### Arquivos a criar/modificar

1. **Migration SQL** — 2 tabelas + RLS + 4 RPCs + bucket
2. `**src/components/services/PortfolioTab.tsx**` — CRUD de portfólio (novo)
3. `**src/pages/PublicPortfolioProject.tsx**` — página pública do projeto (novo)
4. `**src/pages/Services.tsx**` — nova aba
5. `**src/pages/PublicProfile.tsx**` — grid de portfólio
6. `**src/App.tsx**` — rotas `/portfolio` e `/:slug/:projecttitle`
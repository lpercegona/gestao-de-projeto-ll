## Plano: Ocultar serviços, Explorar público, Botão contratar, Imagens full-width

### Resumo

5 mudanças: (1) toggle ocultar/apresentar nos itens de serviço do admin, (2) página pública `/list` com listagem de projetos e perfis com filtro, (3) botão "Contratar" sticky nos cards de serviço do perfil público e na página de portfólio com serviço vinculado, (4) imagens full-width sem gaps na página de projeto, (5) RPCs para listagem pública global.

---

### 1. Migration SQL

```sql
-- RPC: listar todos os projetos de portfólio públicos de todos os usuários
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

-- RPC: listar todos os perfis públicos
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
```

### 2. Ocultar/Apresentar serviços no admin (`src/pages/Services.tsx`)

- O `service_catalog` já tem coluna `is_active`
- Adicionar no dropdown de cada card de serviço a opção "Ocultar"/"Apresentar" que faz toggle de `is_active`
- Mostrar badge "Oculto" quando `is_active = false` (similar ao portfólio)
- Mostrar todos os itens (ativos e inativos) no admin, mas marcar visualmente os ocultos

### 3. Nova página: `src/pages/PublicExplore.tsx`

- Rota pública `/list`
- Filtro toggle entre "Projetos" e "Perfis" (tabs ou segmented control)
- **Projetos**: grid 2 colunas mobile, mostra capa + título + nome do profissional, cada item linka para `/:slug/:projectId`
- **Perfis**: grid de cards com avatar, nome, empresa, linka para `/:slug`
- Chama RPCs `get_all_public_portfolio` e `get_all_public_profiles`

### 4. Botão "Contratar" nos serviços do perfil público (`src/pages/PublicProfile.tsx`)

- Adicionar botão "Contratar" em cada card de serviço (visual apenas, sem ação)

### 5. Botão "Contratar" sticky na página de portfólio (`src/pages/PublicPortfolioProject.tsx`)

- Quando o projeto tem `service_name` (serviço vinculado), mostrar botão fixo na base
- Comportamento: visível normalmente, esconde ao scroll down, reaparece ao scroll up
- Implementar com `useEffect` + listener de scroll comparando `scrollY` anterior

### 6. Imagens full-width sem gap (`src/pages/PublicPortfolioProject.tsx`)

- Remover `max-w-3xl`, `px-4`, `space-y-4`, `rounded-lg` das imagens
- Imagens ocupam 100% da largura sem padding/margin entre elas
- Manter o header (título, badge, descrição) com padding normal, mas as imagens vão edge-to-edge

### 7. Rota (`src/App.tsx`)

- Adicionar `<Route path="/explore" element={<PublicExplore />} />`

---

### Arquivos a criar/modificar

1. **Migration SQL** — 2 RPCs públicas
2. `**src/pages/PublicExplore.tsx**` — nova página (criar)
3. `**src/pages/Services.tsx**` — toggle ocultar/apresentar nos serviços
4. `**src/pages/PublicProfile.tsx**` — botão "Contratar" nos cards de serviço
5. `**src/pages/PublicPortfolioProject.tsx**` — botão sticky + imagens full-width
6. `**src/App.tsx**` — rota `/explore`
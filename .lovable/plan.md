

## Plano: Landing com portfólio, navegação contextual, avatar no projeto, contato no perfil

### Resumo

6 mudanças: (1) Reescrever Landing com seção de projetos públicos via RPC, (2) navegação contextual no projeto (voltar para `/list` ou `/:slug` conforme origem), (3) avatar+nome do criador na página de projeto com link ao perfil, (4) verificar páginas públicas sem retorno, (5) campos de contato no perfil público com toggle de visibilidade, (6) migration para novos campos e atualização das RPCs.

---

### 1. Migration SQL

- Adicionar colunas à tabela `profiles`:
  - `contact_email text` (email público, separado do email de login)
  - `contact_phone text`
  - `show_contact_info boolean NOT NULL DEFAULT false`
- Atualizar RPC `get_public_profile` para retornar `contact_email`, `contact_phone`, `show_contact_info`
- Atualizar RPC `get_public_portfolio_project` para retornar `owner_name`, `owner_avatar`, `owner_slug` (join com profiles)

### 2. Editar: `src/pages/Landing.tsx`

- Substituir hero e features genéricos por conteúdo focado na plataforma como marketplace de profissionais/portfólio
- Após o hero, adicionar seção com grid limitado (6-8 projetos) usando RPC `get_all_public_portfolio`
- Botões "Ver todos os projetos" e "Ver perfis" linkando para `/list` com respectiva tab
- Manter header com logo e botões login/entrar
- Manter footer

### 3. Editar: `src/pages/PublicPortfolioProject.tsx`

- Aceitar `from` query param (`?from=list`) para determinar destino do botão voltar
- Se `from=list`: voltar para `/list`, senão voltar para `/:slug`
- Adicionar avatar pequeno + nome do criador acima do título, clicável para `/:slug`
- Requer dados do owner (da RPC atualizada)
- Reorganizar layout: avatar/nome do criador → título → badge → descrição

### 4. Editar: `src/pages/PublicExplore.tsx`

- Nos links de projeto, adicionar `?from=list` ao href: `/${item.owner_slug}/${item.id}?from=list`
- Adicionar link de voltar para `/` (landing) no topo

### 5. Editar: `src/pages/PublicProfile.tsx`

- Adicionar seção de contato (email, telefone) abaixo do nome/empresa quando `show_contact_info` é true
- Adicionar link de voltar para `/list` ou `/` no topo
- Buscar novos campos da RPC atualizada

### 6. Editar: `src/components/settings/ProfileEditTab.tsx`

- Adicionar campos `contact_email`, `contact_phone` e toggle `show_contact_info` na seção de perfil público
- Salvar junto com os outros dados do perfil

### 7. Verificação de navegação pública

- Landing (`/`) → `/list` → `/:slug/:projectId` (voltar para `/list`)
- Landing (`/`) → `/list` → `/:slug` → `/:slug/:projectId` (voltar para `/:slug`)
- `/:slug` → `/:slug/:projectId` (voltar para `/:slug`)
- `/list` tem link de voltar para `/`
- `/:slug` tem link de voltar para `/list`
- Not found pages mantêm links de retorno

---

### Arquivos a criar/modificar

1. **Migration SQL** — 3 colunas em profiles + 2 RPCs atualizadas
2. **`src/pages/Landing.tsx`** — reescrita com grid de projetos
3. **`src/pages/PublicPortfolioProject.tsx`** — avatar do criador + navegação contextual
4. **`src/pages/PublicExplore.tsx`** — query param `from=list` + link voltar
5. **`src/pages/PublicProfile.tsx`** — contato + link voltar
6. **`src/components/settings/ProfileEditTab.tsx`** — campos de contato público


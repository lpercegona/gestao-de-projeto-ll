## Plano: Página de Perfil Público do Admin

### Resumo

Criar página pública `/meunome` que exibe perfil do admin (nome, empresa, avatar, capa) e catálogo de serviços ativos. Adicionar controles no ProfileEditTab para ativar/desativar, definir slug e fazer upload de imagem de capa.

---

### 1. Migration SQL

Adicionar colunas na tabela `profiles` e criar RPCs para acesso público:

```sql
ALTER TABLE public.profiles
  ADD COLUMN public_profile_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN public_profile_slug text UNIQUE,
  ADD COLUMN cover_url text;

-- RPC: buscar perfil público por slug (sem autenticação)
CREATE FUNCTION public.get_public_profile(p_slug text)
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
CREATE FUNCTION public.get_public_profile_services(p_slug text)
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
```

### 2. Novo arquivo: `src/pages/PublicProfile.tsx`

- Rota pública sem autenticação
- Recebe slug via `useParams`
- Chama RPCs `get_public_profile` e `get_public_profile_services`
- Layout minimalista: imagem de capa no topo, avatar sobreposto, nome, empresa
- Grid de cards de serviços abaixo
- Mensagem de "perfil não encontrado" se slug inválido ou desativado
- Preparado para futura contratação (estrutura extensível)

### 3. Editar: `src/components/settings/ProfileEditTab.tsx`

Adicionar seção "Perfil Público" (apenas para admin/master_admin, após Informações Fiscais):

- **Switch** para ativar/desativar perfil público
- **Input** para slug da URL com validação (apenas letras minúsculas, números, hifens)
- **Preview** da URL completa (ex: `oras.lovable.app/meunome`)
- **Upload de capa** com preview da imagem (usando bucket `avatars` ou novo path)
- Salvar junto com `handleSaveProfile`

### 4. Editar: `src/App.tsx`

Adicionar rota pública:

```tsx
<Route path="/meunome" element={<PublicProfile />} />
```

### 5. Storage

Reutilizar o bucket `avatars` para as imagens de capa (path: `{user_id}/cover.{ext}`), pois já é público.

---

### Arquivos a criar/modificar

1. **Migration SQL** — 3 colunas em `profiles` + 2 RPCs
2. `**src/pages/PublicProfile.tsx**` — nova página pública
3. `**src/components/settings/ProfileEditTab.tsx**` — seção de perfil público
4. `**src/App.tsx**` — rota `/menome`
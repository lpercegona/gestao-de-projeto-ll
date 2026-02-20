
# Substituir logo ORAS pelo nome do admin no header da proposta compartilhavel

## O que muda

No header da pagina publica de proposta (`/proposta/:token`), a logo "ORAS" sera removida e substituida pelo nome completo do perfil admin que criou a proposta. Abaixo do nome, aparecera o nome da empresa cadastrada no perfil, caso exista.

## Solucao tecnica

### 1. Adicionar coluna `company_name` na tabela `profiles`

A coluna ainda nao existe no banco. O `ProfileEditTab.tsx` ja salva esse campo usando `as any`, mas ele nao persiste de fato. Sera necessario criar uma migracao SQL:

```text
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT;
```

Isso tambem resolve o problema silencioso do perfil do admin que ja tenta salvar esses campos.

### 2. Atualizar a RPC `get_proposal_by_token`

Adicionar dois campos ao retorno: `admin_name` e `admin_company`, obtidos via JOIN com a tabela `profiles` usando `p.created_by` ou `p.owner_id`:

```text
RETURN QUERY
SELECT
  p.id, p.title, p.description, ...
  prof.full_name AS admin_name,
  prof.company_name AS admin_company,
  ...
FROM proposals p
LEFT JOIN proposal_templates pt ON pt.id = p.template_id
LEFT JOIN profiles prof ON prof.user_id = COALESCE(p.owner_id, p.created_by)
WHERE p.share_token = p_token;
```

### 3. Atualizar `PublicProposal.tsx`

- Adicionar `admin_name` e `admin_company` na interface `ProposalData`
- No header, remover `<img src={LogoOras} .../>` e substituir por:

```text
<div>
  <p className="font-semibold text-lg">{proposal.admin_name}</p>
  {proposal.admin_company && (
    <p className="text-sm text-muted-foreground">{proposal.admin_company}</p>
  )}
</div>
```

- Remover o import de `LogoOras` (se nao for usado em outro lugar do arquivo)

### Arquivos modificados

```text
1. Migracao SQL (nova)
   - Adicionar colunas company_name, company_address, cnpj, cpf em profiles

2. Migracao SQL (nova)
   - Atualizar RPC get_proposal_by_token para retornar admin_name e admin_company

3. src/pages/PublicProposal.tsx
   - Interface ProposalData: adicionar admin_name e admin_company
   - fetchProposal: mapear os novos campos
   - Header: trocar logo pelo nome do admin + empresa
   - Remover import do LogoOras
```



# Plano: Permitir que admins criem e gerenciem seus proprios templates de proposta e contrato

## Diagnostico

### Problema 1: `owner_id` ausente nos inserts

Ao criar um template, o codigo nao inclui `owner_id` no payload de insert:

```text
// Proposals - linha 543
.insert({ name, description, items, sections })  // sem owner_id

// Contracts - linha 302
.insert({ name, description, content })  // sem owner_id
```

O campo `owner_id` fica `null`, e a politica RLS do admin exige `owner_id = auth.uid()`. Resultado: o insert falha silenciosamente para admins regulares. Apenas master_admin consegue criar templates (pois sua politica nao verifica `owner_id`).

### Problema 2: Admins nao recebem copias dos templates globais

Diferente do sistema de email templates (que replica templates globais para novos admins no primeiro acesso), os templates de proposta e contrato nao tem essa logica de replicacao. Admins regulares comecam com zero templates e nao conseguem criar novos.

### Problema 3: Fetch nao filtra por owner

A consulta `select('*')` retorna apenas o que o RLS permite. Para admins, isso significa apenas templates com `owner_id = auth.uid()`. Como nenhum template e criado com o `owner_id` do admin, a lista sempre vem vazia.

## Solucao

Replicar o mesmo padrao usado nos email templates: ao carregar os templates, verificar se o admin ja tem copias pessoais. Se nao, copiar dos templates globais (master admin, `owner_id IS NULL`) e salvar com o `owner_id` do admin.

### 1. Proposals - fetchData (src/pages/Proposals.tsx)

Alterar a logica de fetch de templates para:

```text
if (isMasterAdmin) {
  // Master admin edita templates globais (owner_id IS NULL)
  buscar templates onde owner_id IS NULL
} else {
  // Admin regular: buscar templates pessoais
  buscar templates onde owner_id = user.id

  se nenhum template pessoal existir:
    buscar templates globais (owner_id IS NULL)
    criar copias com owner_id = user.id
    usar as copias
}
```

### 2. Proposals - handleSaveTemplate (src/pages/Proposals.tsx)

Incluir `owner_id` no insert:

```text
// Para master admin: owner_id = null (template global)
// Para admin regular: owner_id = user.id
```

### 3. Contracts - fetchData (src/pages/Contracts.tsx)

Mesma logica de replicacao do passo 1.

### 4. Contracts - handleSaveTemplate (src/pages/Contracts.tsx)

Incluir `owner_id` no insert, similar ao passo 2.

### 5. Nenhuma alteracao de banco de dados

As tabelas `proposal_templates` e `contract_templates` ja possuem a coluna `owner_id` nullable e as politicas RLS corretas:
- Admin: `owner_id = auth.uid()`
- Master admin: acesso total

## Secao Tecnica

```text
Arquivos a modificar:

1. src/pages/Proposals.tsx
   - Adicionar imports de useAuth (user, isMasterAdmin)
   - Reescrever fetchData para incluir logica de replicacao de templates
   - Alterar handleSaveTemplate para incluir owner_id no insert
     - master admin: owner_id nao enviado (fica null = global)
     - admin regular: owner_id = user.id

2. src/pages/Contracts.tsx
   - Adicionar imports de useAuth (user, isMasterAdmin)
   - Reescrever fetchData para incluir logica de replicacao de templates
   - Alterar handleSaveTemplate para incluir owner_id no insert
     - master admin: owner_id nao enviado (fica null = global)
     - admin regular: owner_id = user.id

Logica de replicacao (identica para ambos):
  1. Se isMasterAdmin: buscar .is('owner_id', null)
  2. Senao: buscar .eq('owner_id', user.id)
  3. Se resultado vazio: buscar globais, inserir copias com owner_id = user.id
  4. Usar resultado final

Nenhuma migracao SQL necessaria.
```

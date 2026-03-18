

## Plano: Corrigir Serviços Sumindo do Painel

### Diagnóstico

Após investigação no banco de dados:

1. **A tabela `service_catalog` está vazia.** Quando migramos de `localStorage` para banco de dados, os itens existentes no localStorage do admin não foram transferidos para a nova tabela. Isso causou o "sumiço" dos serviços.

2. **Não há propostas vinculadas ao admin@email.com** (`owner_id: 00a9777f-...`), então o painel de serviços fica completamente vazio para esse admin.

3. **O vínculo cliente↔admin está correto**: o cliente `cliente@email.com` está na tabela `client_users` apontando para o client record com `owner_id = 00a9777f-...` (admin@email.com). A política RLS da `service_catalog` para clientes já faz o match correto via `clients.owner_id`.

4. **O perfil do cliente tem `owner_id = NULL`** — isso deve ser corrigido para consistência com o restante do sistema.

### Correções

#### 1. Migração automática do localStorage → banco de dados

**Arquivo: `src/pages/Services.tsx`**

Adicionar lógica de migração única que:
- Lê os itens do localStorage (`services:manual-items:${user.id}`)
- Se existirem itens E a tabela `service_catalog` estiver vazia para esse `owner_id`, insere-os no banco
- Remove a chave do localStorage após migração bem-sucedida
- Executa apenas uma vez (flag de controle)

#### 2. Corrigir `owner_id` nulo no perfil do cliente

**Migration SQL:**

```sql
UPDATE profiles 
SET owner_id = (
  SELECT c.owner_id FROM clients c 
  JOIN client_users cu ON cu.client_id = c.id 
  WHERE cu.user_id = profiles.user_id 
  LIMIT 1
)
WHERE owner_id IS NULL 
AND user_id IN (SELECT user_id FROM user_roles WHERE role = 'client');
```

### Arquivos a modificar
1. **`src/pages/Services.tsx`** — adicionar migração localStorage → service_catalog
2. **Migration SQL** — corrigir `owner_id` nulo em profiles de clientes


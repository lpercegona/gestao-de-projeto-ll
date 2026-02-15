

# Plano: Isolamento de Dados por Admin

## Problema Identificado

Atualmente, varios recursos da plataforma sao compartilhados entre todos os admins, quando deveriam ser individuais. Especificamente:

1. **Templates de Email** (`email_templates`): Todos os admins editam os mesmos templates. Quando um admin altera o template de proposta, a alteracao afeta todos.
2. **Propostas** (`proposals`): Qualquer admin ve todas as propostas de todos os admins.
3. **Contratos** (`contracts`): Qualquer admin ve todos os contratos de todos os admins.
4. **Templates de Proposta** (`proposal_templates`): Compartilhados entre todos os admins.
5. **Templates de Contrato** (`contract_templates`): Compartilhados entre todos os admins.
6. **Servicos/Catalogo** (`Services.tsx`): Itens manuais armazenados no localStorage com chave fixa (nao por usuario). Propostas listadas sem filtro de `owner_id`.
7. **Edge Functions de Email**: Buscam template de email sem filtro de `owner_id`, usando o template de qualquer admin.

**Recursos ja corretamente isolados:** Notificacoes (filtradas por `user_id`), Preferencias pessoais (filtradas por `user_id`), Clientes/Projetos/Tarefas (filtrados por `owner_id` via RLS).

---

## Solucao

### 1. Templates de Email - Conteudo padrao individual por admin

**Problema:** A tabela `email_templates` tem coluna `owner_id` mas todos os registros tem `owner_id = NULL`. Todos os admins editam o mesmo registro.

**Solucao:** Implementar logica de "template pessoal com fallback global":
- Quando um admin acessa a aba de Notificacoes, o sistema busca templates com `owner_id = user.id`
- Se nao existir, cria automaticamente uma copia do template global (`owner_id IS NULL`) para aquele admin
- Cada admin edita apenas seu proprio template
- Templates globais (`owner_id IS NULL`) servem como modelo inicial

**Alteracoes:**
- `NotificationTemplatesTab.tsx`: Alterar `fetchTemplates` para buscar `owner_id = user.id`, com logica de inicializacao automatica (copiar templates globais se nenhum pessoal existir)
- `handleSave`: Garantir que updates usam o ID do template pessoal
- **RLS** (`email_templates`): Adicionar politica para admins verem/editarem apenas seus proprios templates (`owner_id = auth.uid()`) e manter leitura global para o fallback
- **Edge Functions**: Alterar queries para filtrar por `owner_id` do criador da proposta/contrato

### 2. Propostas - Filtro por owner_id

**Problema:** RLS permite que qualquer admin veja todas as propostas.

**Solucao:**
- Alterar RLS de `proposals` para filtrar por `owner_id = auth.uid()` para admins regulares
- Master admin mantem acesso total
- `Proposals.tsx`: Nenhuma mudanca no frontend necessaria (RLS cuida do filtro)
- `Services.tsx`: A query de propostas ja sera filtrada automaticamente pelo RLS

### 3. Contratos - Filtro por owner_id

**Problema:** Mesma situacao das propostas.

**Solucao:**
- Alterar RLS de `contracts` para `owner_id = auth.uid()` para admins
- Master admin mantem acesso total

### 4. Templates de Proposta - Filtro por owner_id

**Solucao:**
- Alterar RLS de `proposal_templates` para `owner_id = auth.uid()` para admins
- Master admin mantem acesso total

### 5. Templates de Contrato - Filtro por owner_id

**Solucao:**
- Alterar RLS de `contract_templates` para `owner_id = auth.uid()` para admins
- Master admin mantem acesso total

### 6. Servicos - Isolamento do catalogo manual

**Problema:** A chave de localStorage `services:manual-items` e compartilhada por todos os usuarios do mesmo navegador.

**Solucao:**
- Alterar a chave para incluir o `user.id`: `services:manual-items:{userId}`
- Importar `useAuth` no `Services.tsx` para obter o ID do usuario

### 7. Edge Functions de Email - Filtro por owner

**Problema:** `send-proposal-email` e `send-contract-email` buscam `email_templates` sem filtrar por `owner_id`.

**Solucao:**
- Buscar o `created_by` da proposta/contrato
- Buscar template com `owner_id = created_by` primeiro
- Fallback para template global (`owner_id IS NULL`) se nao encontrar template pessoal

---

## Secao Tecnica

```text
Migracoes SQL:
  1. DROP + RECREATE RLS policies em:
     - proposals: "Admins can manage proposals" -> adicionar (owner_id = auth.uid())
     - contracts: "Admins can manage contracts" -> adicionar (owner_id = auth.uid())
     - proposal_templates: "Admins can manage templates" -> adicionar (owner_id = auth.uid())
     - contract_templates: "Admins can manage contract templates" -> adicionar (owner_id = auth.uid())
     - email_templates: Separar em SELECT (global) e INSERT/UPDATE/DELETE (owner_id = auth.uid())
  2. Manter politica de master_admin com acesso total em todas as tabelas

Arquivos a modificar:
  - src/components/settings/NotificationTemplatesTab.tsx
    (buscar/criar templates pessoais, filtrar por owner_id)
  - src/pages/Services.tsx
    (chave localStorage com userId)
  - supabase/functions/send-proposal-email/index.ts
    (filtrar email_template por owner_id do criador)
  - supabase/functions/send-contract-email/index.ts
    (filtrar email_template por owner_id do criador)

Nenhum arquivo novo necessario.
```


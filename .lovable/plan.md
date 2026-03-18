

## Plan: Log de Atividades na Caixa de Diálogo de Configurações

### Objetivo
Adicionar uma nova seção "Log de Atividades" no menu do SettingsDialog que exibe um histórico de todas as alterações feitas na conta (criação/edição de clientes, projetos, tarefas, propostas, contratos, usuários, etc).

### 1. Criar tabela `audit_logs` no banco de dados

Nova tabela para armazenar eventos de auditoria:

```sql
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,        -- 'create', 'update', 'delete'
  entity_type text NOT NULL,   -- 'client', 'project', 'task', 'proposal', 'contract', 'user'
  entity_id uuid,
  entity_name text,
  details jsonb DEFAULT '{}'
);
```

Com RLS policies para admin/master_admin verem logs da sua conta e usuários verem seus próprios logs.

### 2. Criar triggers para popular `audit_logs`

Triggers em tabelas-chave (`clients`, `projects`, `tasks`, `proposals`, `contracts`, `profiles`) que inserem registros no `audit_logs` automaticamente em INSERT/UPDATE/DELETE.

### 3. Criar componente `ActivityLogTab`

**Novo arquivo: `src/components/settings/ActivityLogTab.tsx`**

- Consulta `audit_logs` filtrada por `owner_id` (para admin) ou `user_id` (para todos)
- Exibe uma timeline/tabela com: data/hora, usuário, ação, tipo de entidade, nome da entidade
- Ícones por tipo de entidade e badges por tipo de ação (criou, editou, removeu)
- Filtros opcionais por tipo de entidade e período

### 4. Atualizar `SettingsDialog.tsx`

- Adicionar `History` (lucide icon) no import
- Adicionar novo item no `navSections`: `{ id: 'activity-log', label: 'Atividades', icon: History }`
- Disponível para todos os perfis admin/master_admin
- Adicionar case no `renderContent()` para renderizar `<ActivityLogTab />`

### Arquivos a modificar/criar
1. **Migration SQL** — criar tabela `audit_logs` + RLS + triggers
2. **`src/components/settings/ActivityLogTab.tsx`** — novo componente
3. **`src/components/settings/SettingsDialog.tsx`** — adicionar item no menu


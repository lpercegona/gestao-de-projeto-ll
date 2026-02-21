

# Compartilhamento por Projeto e Autonomia do Cliente

## Resumo

O compartilhamento permanece no nivel do projeto (tabela `user_project_access` existente). Quem tem acesso ao projeto ve todas as tarefas vinculadas. As mudancas sao:

1. **Modal de compartilhamento no projeto**: Os avatares nos cards de projeto se tornam clicaveis e abrem um modal para adicionar/remover usuarios por email.
2. **Autonomia do cliente**: Clientes podem criar, editar e excluir suas proprias tarefas diretamente (sem fluxo de aprovacao).
3. **Timer condicional**: Clientes veem o timer de horas apenas em tarefas criadas por eles mesmos.

## 1. Modal de Compartilhamento de Projeto

Novo componente `ProjectShareDialog.tsx` que:
- Lista todos os usuarios com acesso ao projeto (avatares + nome/email)
- Campo de email para adicionar novos usuarios
- Busca o usuario pelo email na tabela `profiles`
- Cria registro em `user_project_access` ao adicionar
- Remove registro de `user_project_access` ao remover (exceto owner)
- Acessivel apenas para admins/master e o owner do projeto

Os avatares nos cards (ProjectListView e ProjectKanbanView) passam a ser clicaveis, abrindo o modal.

## 2. Autonomia do Cliente

Atualmente `clientRestrictedMode = true` bloqueia todas as acoes de tarefa. A mudanca e:

- Clientes podem criar tarefas diretamente (INSERT em `tasks`)
- Clientes podem editar/excluir tarefas onde `created_by = auth.uid()`
- Tarefas criadas pelo admin continuam somente-leitura para o cliente (pode solicitar edicao)

## 3. Timer Condicional para Clientes

- `showTimeControls = true` apenas quando `task.created_by === user.id`
- Tarefas do admin: sem timer, sem registro de horas
- Tarefas do proprio cliente: timer + registro de horas liberados

## Secao Tecnica

### Migracao SQL

Novas politicas RLS na tabela `tasks`:

```text
1. "Clients can insert own tasks"
   - INSERT com check: has_role('client') AND created_by = auth.uid()
     AND project pertence ao client_id do usuario

2. "Clients can update own tasks"
   - UPDATE using: has_role('client') AND created_by = auth.uid()

3. "Clients can delete own tasks"
   - DELETE using: has_role('client') AND created_by = auth.uid()
```

### Arquivos novos

```text
src/components/projects/ProjectShareDialog.tsx
  - Props: projectId, isOpen, onClose, isAdminOrMaster
  - Busca membros atuais via user_project_access + profiles
  - Campo de email para adicionar
  - Botao de remover por membro
  - Insere/deleta em user_project_access
```

### Arquivos modificados

```text
1. src/components/projects/ProjectListView.tsx
   - Tornar os avatares clicaveis (onClick abre ProjectShareDialog)
   - Nova prop: onShareProject(projectId)
   - Passar projectId para o dialog

2. src/components/projects/ProjectKanbanView.tsx
   - Mesma logica: avatares clicaveis abrem ProjectShareDialog

3. src/pages/ClientProjects.tsx
   - Remover clientRestrictedMode nas props do ProjectListView e ProjectKanbanView
   - Condicionar por tarefa:
     * task.created_by === user.id -> allowTaskEdit, allowTaskDelete, showTimeControls = true
     * senao -> false (manter onRequestEdit para tarefas do admin)
   - Alterar onCreateTask para inserir diretamente em tasks (nao mais via edit_requests)
   - Adicionar dialog simples de criacao de tarefa (similar ao do admin)

4. src/components/projects/TaskCard.tsx
   - Nenhuma mudanca estrutural, apenas recebe props diferentes do ClientProjects
```

### Fluxo do Modal de Compartilhamento

```text
[Clique nos avatares do projeto]
  -> Modal abre com lista de membros atuais
  -> Campo de email + botao "Adicionar"
  -> Busca em profiles por email
  -> Se encontrado: insere em user_project_access
  -> Se nao encontrado: mensagem de erro
  -> Botao "Remover" ao lado de cada membro (exceto owner)
```

### Logica de permissoes por tarefa no ClientProjects

```text
Para cada tarefa:
  isOwnTask = task.created_by === user.id

  showTimeControls = isOwnTask
  allowTaskEdit = isOwnTask && !isPendingApproval
  allowTaskDelete = isOwnTask && !isPendingApproval
  showRegisterTimeButton = isOwnTask && !isPendingApproval
  allowTimeEntryEdit = isOwnTask && !isPendingApproval
  onRequestEdit = !isOwnTask ? handleOpenTaskEditDialog : undefined
```

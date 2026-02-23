
# Habilitar Editar/Excluir Projetos Proprietarios e Controlar Criacao de Tarefas

## Resumo

Clientes poderao editar e excluir diretamente projetos que eles mesmos criaram (`created_by === user.id`). Para projetos criados pelo admin, o comportamento atual de "Solicitar Edicao" sera mantido. Alem disso, o botao "Nova Tarefa" so criara tarefas diretamente em projetos proprietarios; em projetos do admin, abrira o fluxo de solicitacao de nova tarefa (via `edit_requests`).

## Mudancas Necessarias

### 1. Banco de dados - Novas politicas RLS

Adicionar duas politicas na tabela `projects` para permitir que clientes atualizem e excluam seus proprios projetos:

- **Clients can update own projects**: permite UPDATE onde `created_by = auth.uid()` e `client_id = get_user_client_id(auth.uid())`
- **Clients can delete own projects**: permite DELETE onde `created_by = auth.uid()` e `client_id = get_user_client_id(auth.uid())`

### 2. `src/pages/ClientProjects.tsx`

**Novo helper**: `isOwnProject(project)` - verifica se `project.created_by === user?.id`

**Funcoes de edicao direta de projeto**:
- `handleDirectEditProject(project)`: abre um dialog para editar nome, descricao e prazo do projeto diretamente (INSERT direto no banco, nao via edit_request)
- `handleSubmitDirectEditProject()`: faz UPDATE direto no `projects`
- `handleDeleteProject(project)`: abre confirmacao e faz DELETE direto no `projects`

**Novo dialog**: Dialog de edicao direta de projeto (reutilizando o pattern do dialog de criacao ja existente)

**Novo dialog**: AlertDialog de confirmacao de exclusao de projeto

**Logica condicional no `onEditProject`**:
- Se `isOwnProject(project)`: abre dialog de edicao direta
- Se nao: abre `openEditRequest(project)` (solicitar edicao, como hoje)

**Logica condicional no `onDeleteProject`**:
- Se `isOwnProject(project)`: abre confirmacao de exclusao
- Se nao: nao faz nada (permanece vazio)

**Logica condicional no `onCreateTask`**:
- Se `isOwnProject(project)`: `handleOpenTaskCreate(projectId)` (criacao direta, como hoje)
- Se nao: abre dialog de solicitacao de nova tarefa (via `edit_requests`, igual ao `QuickRequestCard`)

**Novo dialog**: Dialog de solicitacao de nova tarefa para projetos do admin (similar ao existente no `QuickRequestCard`)

**Mudanca nos menus de projeto nas views**: O label do botao de editar mostrara "Editar" para projetos proprios e "Solicitar Edicao" para projetos do admin. O botao de excluir so aparecera para projetos proprios.

### 3. Mudancas nas Views (`ProjectListView`, `ProjectTableView`, `ProjectKanbanView`)

As views ja recebem `currentUserId` e `created_by` nos projetos. A logica de qual acao executar sera controlada no `ClientProjects.tsx` (camada de callbacks), nao nas views. Porem, para mostrar/ocultar o botao "Excluir" nos menus de projeto em modo cliente:

- No `ProjectListView`: quando `allowProjectEditOnly && !isAdminOrMaster`, mostrar "Excluir" apenas se `project.created_by === currentUserId`
- No `ProjectTableView`: mesma logica
- No `ProjectKanbanView`: nao possui menu de projeto no modo cliente (nao precisa de mudanca)

Para o botao "Nova Tarefa" dentro dos projetos expandidos: a label e o comportamento serao controlados pelo callback `onCreateTask` que ja e passado -- a logica condicional ficara no `ClientProjects.tsx`.

## Secao Tecnica

### Migracao SQL

```sql
-- Clients can update own projects
CREATE POLICY "Clients can update own projects"
ON public.projects FOR UPDATE
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND created_by = auth.uid() 
  AND client_id = get_user_client_id(auth.uid())
);

-- Clients can delete own projects
CREATE POLICY "Clients can delete own projects"
ON public.projects FOR DELETE
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND created_by = auth.uid() 
  AND client_id = get_user_client_id(auth.uid())
);
```

### `src/pages/ClientProjects.tsx`

```text
1. Adicionar helper:
   const isOwnProject = (project: UnifiedProject) => 
     project.created_by === user?.id;

2. Adicionar estados:
   - projectEditDialogOpen, projectEditForm (name, description, due_date, id)
   - projectEditSubmitting
   - projectDeleteDialogOpen, projectToDelete

3. Implementar handleDirectEditProject(project):
   - Preencher projectEditForm com dados do projeto
   - Abrir projectEditDialogOpen

4. Implementar handleSubmitDirectEditProject:
   - UPDATE em projects (name, description, due_date)
   - refreshData

5. Implementar handleDeleteProject(project):
   - Setar projectToDelete
   - Abrir projectDeleteDialogOpen

6. Implementar handleConfirmDeleteProject:
   - DELETE em projects
   - refreshData

7. Adicionar dialog de solicitacao de nova tarefa para projetos do admin:
   - taskRequestDialogOpen, taskRequestForm, taskRequestProjectId
   - handleSubmitTaskRequest: INSERT em edit_requests com request_type = 'new_task'

8. Modificar callbacks nas 3 views:
   - onEditProject: isOwnProject ? handleDirectEditProject : openEditRequest
   - onDeleteProject: isOwnProject ? handleDeleteProject : () => {}
   - onCreateTask: isOwnProject ? handleOpenTaskCreate : handleOpenTaskRequest

9. Adicionar JSX dos novos dialogs (edicao direta, exclusao projeto, solicitacao tarefa)
```

### `src/components/projects/ProjectListView.tsx`

```text
No bloco de menu dropdown do projeto (linhas 455-479):
- Quando allowProjectEditOnly && !isAdminOrMaster:
  - Mostrar "Excluir" se project.created_by === currentUserId
  - Mostrar label "Editar" se project.created_by === currentUserId
  - Manter "Solicitar Edicao" se project.created_by !== currentUserId
```

### `src/components/projects/ProjectTableView.tsx`

```text
Mesmo ajuste no menu dropdown de projetos para modo cliente,
usando isOwnProject que ja existe (linha 237).
```

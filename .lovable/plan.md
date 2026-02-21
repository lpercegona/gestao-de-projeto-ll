
# Correcoes e Melhorias: Aceite de Projetos, Criacao de Projetos pelo Cliente, Tabela com Checkbox Colorido e Dialog de Detalhes

## Problema 1: Tarefas de solicitacoes sao interpretadas como texto de descricao

Quando um cliente solicita um novo projeto com tarefas no `ProjectRequestForm`, as tarefas sao embutidas como HTML no campo `briefing` (funcao `buildBriefingPayload`, linha 106). Quando o admin aprova a solicitacao em `Projects.tsx` (funcao `handleUpdateRequest`/`handleQuickApproveRequest`), o projeto e criado usando `request.briefing` como descricao -- as tarefas ficam como texto HTML dentro da descricao em vez de serem criadas como registros separados na tabela `tasks`.

**Solucao**: Duas mudancas:
1. No `ProjectRequestForm.tsx`, salvar as tarefas como JSON estruturado em um campo separado (`requested_tasks`) dentro do briefing, ou em um campo dedicado na tabela `project_requests`.
2. Na aprovacao (em `Projects.tsx`), parsear as tarefas e cria-las como registros individuais na tabela `tasks`.

A abordagem mais simples (sem migracao de banco): armazenar as tarefas como JSON no final do briefing em formato estruturado que pode ser parseado, OU salvar separadamente. A melhor abordagem e adicionar uma coluna `requested_tasks` (jsonb) na tabela `project_requests`.

## Problema 2: Erro ao criar projetos proprietarios por clientes

A tabela `projects` nao tem politica RLS de INSERT para clientes. A unica politica para clientes e `Clients can view own projects` (SELECT). Quando o cliente tenta inserir diretamente em `projects`, o RLS bloqueia a operacao.

**Solucao**: Criar uma politica RLS que permita clientes inserirem projetos onde `client_id = get_user_client_id(auth.uid())` e `created_by = auth.uid()`.

## Problema 3: Checkbox da tabela sem cor por etapa e sem atualizacao instantanea

Atualmente os checkboxes usam estilos estaticos. Nao refletem a cor da etapa kanban e a UI nao atualiza apos o clique (requer reload).

**Solucao**: 
- Manter estado local do status de projetos/tarefas para atualizacao instantanea
- Aplicar a cor do kanban stage no checkbox (usar o campo `color` de `kanbanStages`)
- Apos o clique, atualizar o estado local imediatamente e fazer o update no banco em background

## Problema 4: Dialog de detalhes diferente do card expandido

O dialog atual na `ProjectTableView` mostra informacoes basicas (nome, status, horas, descricao). O card expandido na `ProjectListView` mostra mais informacoes (cliente, campos customizados, tarefas com status, responsavel, registros de horas).

**Solucao**: Enriquecer o `DetailContent` da `ProjectTableView` para incluir todas as informacoes do card expandido, e adicionar botoes de acao (editar, excluir, etc.).

---

## Secao Tecnica

### Migracao SQL

```text
1. Adicionar coluna requested_tasks (jsonb) na tabela project_requests:
   ALTER TABLE project_requests ADD COLUMN requested_tasks jsonb DEFAULT '[]'::jsonb;

2. Criar politica RLS para clientes inserirem projetos:
   CREATE POLICY "Clients can insert own projects"
   ON projects FOR INSERT
   WITH CHECK (
     has_role(auth.uid(), 'client') 
     AND client_id = get_user_client_id(auth.uid())
     AND created_by = auth.uid()
   );
```

### Arquivos modificados

```text
1. src/components/client/ProjectRequestForm.tsx
   - Modificar handleSubmit para salvar tarefas no campo requested_tasks
     ao inves de embuti-las no briefing como HTML
   - Chamar onSubmit com o briefing limpo (sem tarefas embutidas)
   - Passar requested_tasks como parametro adicional para onSubmit

2. src/pages/ClientProjects.tsx
   - Atualizar handleSubmitRequest para receber e salvar requested_tasks
     no campo dedicated da tabela project_requests
   - Garantir que o insert em project_requests inclua requested_tasks

3. src/pages/Projects.tsx
   - handleUpdateRequest (aprovacao): apos criar o projeto, buscar o
     project_request completo (incluindo requested_tasks), e para cada
     tarefa no array, inserir um registro na tabela tasks
   - handleQuickApproveRequest: mesma logica -- parsear requested_tasks
     e criar tarefas individuais apos criacao do projeto

4. src/components/projects/ProjectTableView.tsx
   - Adicionar estado local para projetos/tarefas para refletir mudancas
     de status instantaneamente sem recarregar
   - handleProjectStatusChange: atualizar estado local + banco
   - handleTaskStatusChange: atualizar estado local + banco
   - Aplicar cor do kanban stage nos checkboxes de tarefas usando
     style={{ backgroundColor: stageColor }} quando indeterminate/checked
   - Enriquecer DetailContent para incluir:
     * Botoes de acao (Editar, Excluir, Arquivar)
     * Todas as informacoes que o card expandido mostra
     * Para projetos: cliente, campos customizados, lista de tarefas
       com status, total de horas
     * Para tarefas: responsavel, descricao expandida, registros
       de horas, status com label traduzido
   - Passar callbacks de acao para o DetailContent (onEditProject,
     onDeleteProject, onEditTask, onDeleteTask)
```

### Fluxo corrigido de aceite de projeto com tarefas

```text
1. Cliente cria solicitacao com tarefas
   -> ProjectRequestForm salva briefing separado + requested_tasks como JSON
   -> project_requests.requested_tasks = [
        { title: "Tarefa 1", description: "...", dueDate: "2026-03-01" },
        { title: "Tarefa 2", description: "...", dueDate: null }
      ]

2. Admin aprova solicitacao
   -> Cria projeto via createProject()
   -> Busca requested_tasks do project_request
   -> Para cada tarefa: createTask({ project_id, name, description, due_date, status: 'pending' })
   -> Atualiza project_request.status = 'converted'
```

### Logica de cores do checkbox na tabela

```text
Para tarefas:
  - Encontrar o stage atual no sortedStages
  - Se stage tem cor (ex: "bg-green-500"), aplicar como background
  - Usar classe CSS condicional baseada no stage.color
  - Estado local: manter um Map<taskId, status> que atualiza ao clicar

Para projetos:
  - active = cor amarela/indeterminate
  - paused = cor laranja/indeterminate
  - completed = cor verde/checked
  - archived = cor cinza/unchecked
```

### Estrutura do Dialog de detalhes enriquecido

```text
Dialog (projeto):
  [Nome do projeto]                    [Botao Editar] [Botao Excluir]
  Cliente: [nome]
  Status: [badge]  Horas: [total]  Prazo: [data]
  Descricao: [expandable]
  Campos customizados: [lista]
  Tarefas (N):
    - [nome] [badge status]
    - [nome] [badge status]
  
Dialog (tarefa):
  [Nome da tarefa]                     [Botao Editar] [Botao Excluir]
  Status: [badge]  Horas: [total]  Prazo: [data]
  Responsavel: [nome]
  Descricao: [expandable]
  Registros de horas (N):
    - [data] [horas] [descricao]
```

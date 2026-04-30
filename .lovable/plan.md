## Objetivo

Unificar todos os formulários de criação de projeto sob um único componente reutilizável que sempre permita adicionar tarefas vinculadas durante a criação, mantendo as variações por papel (admin, colaborador, cliente).

## Situação atual

Hoje existem 3 fluxos divergentes de criação de projetos:

| Origem | Local | Tarefas no formulário? |
|---|---|---|
| Admin / Master / Colaborador | `src/pages/Projects.tsx` (FormSheet inline, ~linha 1603) | Não — tarefas só após o projeto criado |
| Cliente — solicitação | `src/components/client/ProjectRequestForm.tsx` | Sim — bloco "Tarefas do projeto" |
| Cliente — projeto direto | `src/pages/ClientProjects.tsx` (`isDirectProjectDialogOpen`, ~linha 1089) | Sim, via lista própria |

O `ProjectRequestForm` já contém o padrão visual desejado (FormSheet + bloco colapsável de tarefas via FormSheet aninhado).

## Proposta

### 1. Novo componente `ProjectFormSheet`

Criar `src/components/projects/ProjectFormSheet.tsx` como ponto único para criação/edição de projetos. Recebe via props o que varia entre papéis e expõe o mesmo bloco de tarefas vinculadas.

Props:
- `open`, `onOpenChange`
- `mode`: `'create' | 'edit'`
- `editingProject?`: para reaproveitar no fluxo de edição existente
- `lockedClientId?`: cliente fixo (cenário cliente) — esconde o seletor de cliente
- `showCollaborators?`: exibe lista de colaboradores (apenas admin)
- `showCustomFieldsManagement?`: permite criar/editar campos personalizados (apenas admin)
- `onSubmit(payload)`: callback que recebe `{ project, tasks, attachments, collaboratorIds }`

Conteúdo do componente (sempre presente, pode ser ocultado por prop):
1. Nome do projeto (obrigatório)
2. Descrição (WYSIWYG)
3. Cliente (oculto se `lockedClientId`)
4. Status
5. Prazo
6. Anexos (`RequestAttachmentsUploader` — habilitado quando há `client_id`)
7. **Tarefas vinculadas (NOVO em todos os fluxos)** — mesmo bloco do `ProjectRequestForm`: lista expansível + FormSheet aninhado "Nova tarefa" com título, descrição e prazo.
8. Colaboradores (apenas admin)
9. Campos personalizados do cliente (lendo `project_columns`)

### 2. Refatorações

**`src/pages/Projects.tsx`** (admin/colaborador)
- Remover a `FormSheet` inline atual (linhas ~1602–1694) e o estado de `formData` espalhado.
- Substituir por `<ProjectFormSheet mode={editingProject ? 'edit' : 'create'} showCollaborators showCustomFieldsManagement ... />`.
- No `onSubmit`, manter a lógica atual de `createProject` + `grantProjectAccess`/`revokeProjectAccess` e adicionar loop de `createTask` para as tarefas do payload (como já é feito em `ClientProjects.handleSubmitDirectProject`).

**`src/pages/ClientProjects.tsx`** (cliente — projeto direto)
- Substituir o `FormSheet` `isDirectProjectDialogOpen` (linhas ~1086–1100) por `<ProjectFormSheet lockedClientId={clientId} ... />`.
- Remover a lista de tarefas paralela (`projectTasks`, `setProjectTasks`) — passa a ficar dentro do componente unificado.

**`src/components/client/ProjectRequestForm.tsx`** (solicitação de cliente)
- Permanece separado, pois é um fluxo de **solicitação** (`project_requests`), não criação direta. Continuará reutilizando o bloco de tarefas (manter o mesmo subcomponente `RequestedTasksBlock` extraído de `ProjectFormSheet` para garantir paridade visual). Opção: extrair `RequestedTasksBlock` em arquivo próprio e usar nos dois.

### 3. Bloco de tarefas extraído

Extrair de `ProjectRequestForm` o trecho de "Tarefas do projeto (opcional)" (linhas 271–322 + FormSheet aninhado de nova tarefa, 336–377) para `src/components/projects/RequestedTasksBlock.tsx`. Será consumido por:
- `ProjectFormSheet` (novo)
- `ProjectRequestForm` (refatoração para usar o bloco extraído)

Interface:
```ts
type DraftTask = { title: string; description: string; dueDate: string };
interface RequestedTasksBlockProps {
  tasks: DraftTask[];
  onChange: (tasks: DraftTask[]) => void;
  disabled?: boolean;
}
```

### 4. Persistência das tarefas no fluxo direto

Em `ProjectFormSheet.onSubmit`, após `createProject` retornar o id, percorrer `tasks[]` e chamar `createTask({ project_id, name, description, due_date, status: 'pending' })` — mesmo padrão já validado em `ClientProjects.handleSubmitDirectProject`.

## Arquivos afetados

- Novo: `src/components/projects/ProjectFormSheet.tsx`
- Novo: `src/components/projects/RequestedTasksBlock.tsx`
- Editar: `src/pages/Projects.tsx` — substituir FormSheet de projeto + handleSubmit
- Editar: `src/pages/ClientProjects.tsx` — substituir FormSheet direto e remover estado de tarefas paralelo
- Editar: `src/components/client/ProjectRequestForm.tsx` — usar `RequestedTasksBlock`

## Não inclui

- Mudanças em `project_requests` ou em RLS.
- Alteração no fluxo de edição de tarefas existentes (continua via `isTaskDialogOpen` em `Projects.tsx`).
- Mudanças no schema do banco — `tasks` já aceita `name`, `description`, `due_date`, `status`.

## Resultado esperado

Qualquer ponto do app que abrir "Novo Projeto" (Ações Rápidas, página Projetos, página de projetos do cliente, deep link `?new=1`) renderiza o mesmo `ProjectFormSheet`, com o mesmo bloco de tarefas vinculadas, criando projeto e tarefas em uma única submissão.

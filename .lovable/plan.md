# Correcoes: Checkbox Kanban, Permissoes e Dialog no Formato do Card

## Problema 1: Checkboxes nao refletem etapas kanban corretamente

Os status de tarefas no banco estao misturados entre valores legados (`pending`, `in_progress`, `completed`) e nomes de etapas kanban (`Pendente`, `Em Andamento`, `Concluida`). A funcao `getTaskStageColor` busca pelo nome da etapa, mas falha para os status legados.

**Solucao**: Adicionar mapeamento bidirecional entre status legados e nomes de etapas:

- `pending` -> `Pendente`
- `in_progress` -> `Em Andamento`  
- `completed` -> `Concluida`

Aplicar esse mapeamento em `getTaskStageColor`, `getTaskCheckState` e `getNextTaskStatus` para que o checkbox sempre encontre a etapa correta e sua cor.

## Problema 2: Permissoes do checkbox

Atualmente o checkbox de tarefas so e desabilitado para tarefas `is_pending_approval`. Clientes que nao sao proprietarios da tarefa nao deveriam poder alterar o status via checkbox.

**Solucao**: Desabilitar o checkbox quando:

- Cliente nao e proprietario da tarefa (`created_by !== currentUserId`)
- E nao e admin/master
- Manter habilitado para: admins, masters, e clientes que sao criadores da tarefa

## Problema 3: Dialog deve replicar o visual do card expandido

O dialog atual usa um layout simplificado com campos de texto. Conforme a imagem de referencia, deve replicar exatamente o visual do card da `ProjectListView`, incluindo:

- Cabecalho com nome do projeto + badge de status + icone membros + menu de acoes
- Descricao expandivel
- Informacoes: Cliente, Tarefas (contagem), Horas
- Campos customizados
- Avatares dos membros
- Secao de tarefas com `TaskCard` completo (timer, registros de horas, menu de acoes)
- Botao "Nova Tarefa"

&nbsp;

# Problema 4: habilitar registro de horas para clientes em tarefas proprietarias

Cliente já consegue visualizar botões de interação para registro de horas, mas não consegue visualizar a caixa de diálogo para conclusão do registro. 

Verificar permisões para da caixa de diálogo de conclusão de tarefa possibilitando que cliente possam fazer regiatros apenas em tarefas proprietárias.

## Secao Tecnica

### Arquivo modificado: `src/components/projects/ProjectTableView.tsx`

```text
1. Corrigir mapeamento de status legados para etapas kanban:
   - Criar funcao mapStatusToStageName(status) que converte
     'pending' -> 'Pendente', 'in_progress' -> 'Em Andamento',
     'completed' -> 'Concluida' e retorna o proprio valor se ja
     for um nome de etapa valido
   - Usar em getTaskStageColor, getTaskCheckState e getNextTaskStatus

2. Permissoes do checkbox:
   - Checkbox de projetos: desabilitar se isClientMode E projeto
     nao foi criado pelo usuario atual
   - Checkbox de tarefas: desabilitar se isClientMode E tarefa
     nao foi criada pelo usuario atual (created_by !== currentUserId)
   - Admins/masters sempre podem interagir

3. Substituir DetailContent por layout identico ao card da
   ProjectListView:
   - Adicionar props adicionais necessarias: taskTimers, projectAccess,
     onCreateTask, onRegisterTime, onStartTimer, onStopTimer,
     onCompleteTask, getActiveTimer
   - Dialog de projeto: renderizar o mesmo layout do card expandido
     com CardContent mostrando cabecalho (nome + status badge +
     membros + menu), descricao, info (Cliente, Tarefas, Horas),
     campos customizados, avatares, e secao de tarefas com TaskCard
   - Dialog de tarefa: renderizar diretamente o TaskCard com todas
     as props (timer, registros, menu)
   - Manter DialogContent com max-w-2xl para acomodar o layout
```

### Props adicionais em ProjectTableViewProps

```text
Novas props necessarias (mesmas da ProjectListView):
  - taskTimers: TaskTimer[]
  - projectAccess: ProjectAccess[]
  - getActiveTimer: (taskId: string) => TaskTimer | null
  - onCreateTask: (projectId: string) => void
  - onRegisterTime: (taskId: string, entry?) => void
  - onStartTimer: (taskId: string) => Promise<void>
  - onStopTimer: (taskId: string) => Promise<void>
  - onCompleteTask: (taskId: string) => Promise<void>
```

### Arquivos que passam as props

```text
- src/pages/Projects.tsx: adicionar as novas props ao render
  de ProjectTableView
- src/pages/ClientProjects.tsx: adicionar as novas props ao
  render de ProjectTableView
```
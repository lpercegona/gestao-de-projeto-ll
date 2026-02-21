# Correcao de Build + Nova Visualizacao em Tabela + Ajustes de UI

## 1. Corrigir erro de build: `create_client_owned_project`

O erro ocorre porque a funcao RPC `create_client_owned_project` existe no banco mas nao esta refletida no arquivo auto-gerado `types.ts`. O Supabase gera os tipos automaticamente, mas pode haver delay.

**Solucao**: Substituir a chamada `supabase.rpc('create_client_owned_project', ...)` por inserts diretos nas tabelas `projects` e `tasks` (mesmo padrao ja usado no `handleSubmitTaskCreate`). Isso elimina a dependencia do RPC e resolve o erro de tipagem.

## 2. View toggle: exibir texto apenas no modo selecionado

No `ProjectFilters.tsx`, os botoes "Lista" e "Kanban" sempre mostram texto. Adicionar uma terceira opcao "Tabela" e ajustar para que o texto apareca apenas no item ativo (os inativos mostram apenas icone).

## 3. Nova visualizacao em formato de tabela

Criar o componente `ProjectTableView.tsx` com o formato solicitado:

- Cada projeto aparece como uma linha-cabecalho com accordion
- Ao expandir, mostra as tarefas do projeto em linhas filhas
- Formato de cada linha (projeto e tarefa):

```text
[Checkbox] [Titulo] [Data prazo] [Menu ...]
```

### Checkbox

- Para **projetos**: alterna entre status (active/paused/completed/archived)
- Para **tarefas**: alterna entre as etapas kanban definidas (Pendente -> Em Andamento -> Concluida) refletindo novas etapas personalizadas se criado através do kanban.
- Checkbox marcado = status final (completed/Concluida)
- Checkbox intermediario (indeterminate) = em andamento

### Clique no titulo

- Abre um `Dialog` com todas as informacoes do projeto ou tarefa (nome, descricao, status, prazo, horas, responsavel, registros de horas)

### Menu de acoes (icone ...)

- Para admins: Editar / Arquivar / Excluir / 
- Para clientes: Solicitar Alteracao (em tarefas do admin), Editar/Excluir (em tarefas proprias)

## Secao Tecnica

### Arquivos novos

```text
src/components/projects/ProjectTableView.tsx
  - Props: mesmas do ProjectListView (reutiliza interfaces)
  - Renderiza tabela com linhas de projeto (accordion) e linhas de tarefa
  - Checkbox com logica de status/etapa
  - Dialog de detalhes ao clicar no titulo
  - Menu de acoes contextual por linha
```

### Arquivos modificados

```text
1. src/pages/ClientProjects.tsx
   - Corrigir handleSubmitDirectProject: substituir supabase.rpc()
     por supabase.from('projects').insert() + supabase.from('tasks').insert()
   - Adicionar viewMode 'table' ao estado (type: 'list' | 'kanban' | 'table')
   - Renderizar ProjectTableView quando viewMode === 'table'

2. src/pages/Projects.tsx
   - Adicionar viewMode 'table' ao estado
   - Renderizar ProjectTableView quando viewMode === 'table'

3. src/components/projects/ProjectFilters.tsx
   - Adicionar terceiro item no ToggleGroup: "Tabela" com icone ClipboardList
   - Alterar tipo do viewMode de "list" | "kanban" para "list" | "kanban" | "table"
   - Mostrar texto ("Lista", "Kanban", "Tabela") apenas no item ativo;
     itens inativos mostram apenas icone

4. src/components/projects/ProjectListView.tsx
   - Nenhuma mudanca (ja funciona como esta)

5. src/components/projects/ProjectKanbanView.tsx
   - Nenhuma mudanca (ja funciona como esta)
```

### Estrutura do ProjectTableView

```text
<div>
  {projects.map(project => (
    <Collapsible>
      <div className="flex items-center gap-3 py-2 px-3 border-b">
        <Checkbox
          checked={project.status === 'completed'}
          indeterminate={project.status === 'active' || project.status === 'paused'}
          onCheckedChange -> cicla status
        />
        <span onClick={openProjectDetailDialog} className="cursor-pointer flex-1 truncate font-medium">
          {project.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {project.due_date ? format(...) : ''}
        </span>
        <CollapsibleTrigger> <ChevronDown /> </CollapsibleTrigger>
        <DropdownMenu> ... acoes </DropdownMenu>
      </div>
      <CollapsibleContent>
        {projectTasks.map(task => (
          <div className="flex items-center gap-3 py-1.5 px-3 pl-10 border-b bg-muted/30">
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange -> cicla etapas kanban
            />
            <span onClick={openTaskDetailDialog} className="cursor-pointer flex-1 truncate text-sm">
              {task.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {task.due_date ? format(...) : ''}
            </span>
            <DropdownMenu> ... acoes </DropdownMenu>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ))}
</div>
```

### Dialog de detalhes (ao clicar no titulo)

Reutiliza informacoes ja disponiveis nas props:

- Nome, descricao (renderizada com ExpandableDescription), status, prazo
- Horas registradas (via getProjectHours/getTaskHours)
- Responsavel (via getCreatorName)
- Campos customizados do projeto (custom_fields + projectColumns)
- Para tarefas: lista de registros de horas (timeEntries)
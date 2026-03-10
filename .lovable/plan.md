

## Plano: Sincronização instantânea de estado entre visualizações

### Problema
Três locais fazem chamadas diretas ao banco (`supabase.from(...).update/insert/delete`) sem atualizar o estado local do `DataContext`, causando descompasso entre visualizações até que `refreshData()` complete o re-fetch completo:

1. **`ProjectTableView.tsx`** — `handleProjectStatusChange` e `handleTaskStatusChange` mantêm estado local (`localProjectStatuses`, `localTaskStatuses`) e chamam `supabase` diretamente, sem propagar a mudança ao `DataContext`
2. **`ClientProjects.tsx`** — Todas as operações CRUD (criar/editar/excluir projeto, criar/editar tarefa, atualizar status, timers, time entries) usam `supabase` diretamente + `refreshData()` em vez dos métodos do `DataContext`

### Solução

Substituir chamadas diretas ao banco pelos métodos do `DataContext` (`updateTask`, `updateProject`, `createTask`, `createProject`, `deleteProject`, `deleteTask`, `createTimeEntry`, etc.) que já fazem atualização otimista do estado local.

#### 1. `src/components/projects/ProjectTableView.tsx`
- `handleProjectStatusChange`: chamar `onUpdateProjectStatus(project.id, next)` (já recebido como prop) ou adicionar um callback prop que use `updateProject` do DataContext
- `handleTaskStatusChange`: chamar `onUpdateTaskStatus(task.id, next)` (já recebido como prop)
- Manter `localProjectStatuses`/`localTaskStatuses` para feedback visual imediato, mas garantir que o callback prop propague ao DataContext

Verificar se as props `onUpdateTaskStatus` e equivalente para projeto já existem e se chamam os métodos do DataContext.

#### 2. `src/pages/ClientProjects.tsx` (~15 operações)
Substituir cada chamada direta por método equivalente do `DataContext`:

| Operação | Atual | Substituir por |
|---|---|---|
| Criar projeto | `supabase.from('projects').insert(...)` + `refreshData()` | `createProject(...)` |
| Editar projeto | `supabase.from('projects').update(...)` + `refreshData()` | `updateProject(id, ...)` |
| Excluir projeto | `supabase.from('projects').delete(...)` + `refreshData()` | `deleteProject(id)` |
| Criar tarefa | `supabase.from('tasks').insert(...)` + `refreshData()` | `createTask(...)` |
| Editar tarefa | `supabase.from('tasks').update(...)` + `refreshData()` | `updateTask(id, ...)` |
| Excluir tarefa | `supabase.from('tasks').delete(...)` + `refreshData()` | `deleteTask(id)` |
| Completar tarefa | `supabase.from('tasks').update({status:'completed'})` + `refreshData()` | `completeTask(id)` |
| Atualizar status tarefa | `supabase.from('tasks').update({status})` + `refreshData()` | `updateTask(id, {status})` |
| Registrar horas | `supabase.from('time_entries').insert(...)` + `refreshData()` | `createTimeEntry(...)` |
| Timer start | `supabase.from('task_timers').insert(...)` + `refreshData()` | `startTaskTimer(id)` |
| Timer stop | `supabase.from('task_timers').delete(...)` + `refreshData()` | `stopTaskTimer(id, desc, type)` |
| Timer discard | `supabase.from('task_timers').delete(...)` + `refreshData()` | `cancelTaskTimer(id)` |

Remover `import { supabase }` se não for mais necessário (manter se usado para queries de leitura como project_requests/edit_requests).

#### 3. `src/pages/Projects.tsx` — Chamadas `refreshData()` restantes
As chamadas a `refreshData()` em operações de solicitações (project_requests, edit_requests) são aceitáveis pois essas entidades não estão no DataContext. Sem alteração necessária aqui.

### Resultado esperado
- Marcar tarefa como concluída na tabela reflete instantaneamente no kanban, lista e calendário
- Criar/editar/excluir projeto ou tarefa na área do cliente reflete em todas as views
- Eliminar re-fetches desnecessários melhora a performance

### Arquivos alterados
1. `src/components/projects/ProjectTableView.tsx` — Usar callbacks que propagam ao DataContext
2. `src/pages/ClientProjects.tsx` — Substituir ~15 chamadas diretas por métodos do DataContext


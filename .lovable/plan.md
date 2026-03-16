

## Plano: 4 correções (exclusão de clientes, diálogo mobile, solicitações órfãs, calendário)

### 1. Corrigir exclusão de clientes (Database)

**Causa**: A tabela `project_requests` possui **duas** foreign keys na coluna `client_id`:
- `project_requests_client_id_fkey` → ON DELETE CASCADE (correto)
- `fk_project_requests_client` → NO ACTION (bloqueia a exclusão)

**Solução**: Migration para remover a FK duplicada `fk_project_requests_client`.

```sql
ALTER TABLE public.project_requests DROP CONSTRAINT fk_project_requests_client;
```

### 2. Corrigir diálogo de edição de tarefas no mobile

**Causa**: O `DialogContent` em `Projects.tsx` (linha 1645) e `ProjectDetail.tsx` (linha 459) não possuem classes de largura responsiva. Em tela de 360px, o diálogo pode extravasar.

**Solução**: Adicionar `max-w-[95vw] sm:max-w-lg` ao `DialogContent` dos diálogos de tarefa em:
- `src/pages/Projects.tsx` (linha 1645)
- `src/pages/ProjectDetail.tsx` (linha 459)
- `src/pages/ClientProjects.tsx` (linha 1322)

### 3. Corrigir solicitações órfãs e label de pendentes

**Causa**: Ao excluir uma `project_request`, os `edit_requests` relacionados (onde `entity_type = 'project_request'` e `entity_id` = ID da solicitação) não são excluídos. Esses registros órfãos permanecem com status `pending` e inflam o contador.

**Solução** (duas frentes):
- **No código** (`src/pages/Projects.tsx`, ~linha 748): Antes de deletar a `project_request`, deletar também os `edit_requests` relacionados:
  ```typescript
  await supabase.from('edit_requests').delete()
    .eq('entity_type', 'project_request')
    .eq('entity_id', project.request_id);
  ```
- **No `pendingRequestsCount`** (linha 454-455): Filtrar `edit_requests` para excluir registros cujo `entity_id` não corresponde a nenhum projeto ou project_request existente (validação defensiva contra órfãos já existentes).

### 4. Desconsiderar projetos/tarefas arquivados no calendário

**Causa**: CalendarPage e DashboardCalendar filtram tarefas pelo próprio `status`, mas não verificam se o **projeto pai** está arquivado. Uma tarefa "pending" de um projeto "archived" ainda aparece no calendário.

**Solução**: Nos dois componentes, adicionar filtro para excluir tarefas cujo projeto está em status `archived`:
- `src/pages/CalendarPage.tsx` (linha 174): adicionar verificação do status do projeto pai
- `src/components/dashboard/DashboardCalendar.tsx` (linha 51): mesma verificação

```typescript
// Exemplo do filtro adicional para tasks
data.tasks
  .filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'archived') return false;
    const project = data.projects.find(p => p.id === t.project_id);
    return project && project.status !== 'archived';
  })
```

### Arquivos alterados
- `supabase/migrations/` — nova migration (remover FK duplicada)
- `src/pages/Projects.tsx` — diálogo mobile, exclusão de edit_requests órfãs, pendingRequestsCount defensivo
- `src/pages/ProjectDetail.tsx` — diálogo mobile
- `src/pages/ClientProjects.tsx` — diálogo mobile
- `src/pages/CalendarPage.tsx` — filtro de tarefas com projeto arquivado
- `src/components/dashboard/DashboardCalendar.tsx` — filtro de tarefas com projeto arquivado


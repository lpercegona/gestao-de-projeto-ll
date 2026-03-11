

## Plano: Corrigir inconsistências de mapeamento de status entre visualizações

### Problemas identificados

1. **Mapeamento duplicado e divergente** — As funções de mapeamento status↔etapa existem em dois arquivos separados (`ProjectTableView.tsx` e `ProjectKanbanView.tsx`) com nomes diferentes mas lógica similar. Qualquer alteração futura precisa ser feita em ambos, gerando risco de divergência.

2. **`completeTask` no DataContext usa `'completed'` hardcoded** — Quando o usuário renomeia a última etapa do Kanban (ex: "Finalizado" em vez de "Concluída"), `completeTask()` salva `status: 'completed'` no banco, que não corresponde a nenhuma etapa customizada — a tarefa "desaparece" para a primeira coluna do Kanban.

3. **`TaskCard` tem fallback hardcoded para status legacy** — A função `getStageInfo` no `TaskCard.tsx` mapeia `pending/in_progress/completed/archived` com nomes e cores fixos, ignorando completamente as etapas customizadas do Kanban quando recebidas via prop `kanbanStages`.

4. **Filtros de `'done'` espalhados pelo código** — Vários componentes filtram `task.status !== 'done'` (CalendarPage, DashboardCalendar, CollaboratorDashboard, TaskCard, ExpandedTimerModal), mas `'done'` nunca é gravado no banco — é um valor fantasma que nunca faz match, poluindo as condições sem efeito.

5. **`getNextTaskStatus` na Tabela cicla para a primeira etapa após a última** — Se a última etapa é "Concluída" e o usuário clica novamente, o status volta para "Pendente". Isso pode ser intencional, mas se o usuário renomeou etapas, o ciclo pode passar por um stage.id (UUID) que não é reconhecido por filtros legacy.

### Solução

#### 1. Extrair mapeamento para módulo compartilhado `src/lib/kanbanStageMapping.ts`
Centralizar todas as funções de mapeamento bidirecional (status DB ↔ nome de etapa) em um único arquivo, eliminando duplicação:
- `getStageKeyFromStatus(status, stages)` — DB status → stage name
- `getStatusFromStageKey(stageName, stages)` — stage name → DB status
- `getStageInfoFromStatus(status, stages)` — retorna `{ name, color, dbStatus }` para um dado status
- `isCompletedStatus(status, stages)` — verifica se o status corresponde à última etapa
- `LEGACY_STATUS_TO_NAME` e `STAGE_NAME_TO_LEGACY` — constantes exportadas

#### 2. Atualizar `ProjectTableView.tsx` e `ProjectKanbanView.tsx`
- Remover funções locais de mapeamento
- Importar do módulo compartilhado

#### 3. Atualizar `TaskCard.tsx`
- Substituir `getStageInfo` hardcoded por chamada ao módulo compartilhado (`getStageInfoFromStatus`)
- A prop `kanbanStages` já é passada — usar efetivamente

#### 4. Atualizar `completeTask` no `DataContext.tsx`
- Em vez de `{ status: 'completed' }`, determinar o status correto da última etapa do Kanban usando `getStatusFromStageKey(lastStage.name, stages)`
- Requer que `DataContext` tenha acesso às `kanbanStages` (já armazenadas em `data.kanbanStages`)

#### 5. Remover referências a `'done'`
- Nos 5 arquivos que filtram `status !== 'done'`, remover essa condição — `'done'` nunca é usado como valor de status no banco
- Arquivos: `CalendarPage.tsx`, `DashboardCalendar.tsx`, `CollaboratorDashboard.tsx`, `TaskCard.tsx`, `ExpandedTimerModal.tsx`

### Arquivos alterados
1. `src/lib/kanbanStageMapping.ts` — **novo** — módulo centralizado
2. `src/components/projects/ProjectTableView.tsx` — importar do módulo
3. `src/components/projects/ProjectKanbanView.tsx` — importar do módulo
4. `src/components/projects/TaskCard.tsx` — usar mapeamento dinâmico
5. `src/contexts/DataContext.tsx` — `completeTask` usa última etapa dinâmica
6. `src/pages/CalendarPage.tsx` — remover `'done'`
7. `src/components/dashboard/DashboardCalendar.tsx` — remover `'done'`
8. `src/pages/CollaboratorDashboard.tsx` — remover `'done'`
9. `src/components/timer/ExpandedTimerModal.tsx` — remover `'done'`


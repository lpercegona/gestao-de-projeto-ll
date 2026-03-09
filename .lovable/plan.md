

## Plano: Filtrar concluídos/arquivados e ajustar visual dos cards de Próximas Entregas

### Problema
1. Projetos/tarefas concluídos ou arquivados ainda aparecem nas listagens de "Próximas Entregas" em algumas views
2. Falta uma label "Atrasado" para itens com prazo vencido
3. Títulos longos extrapolam a largura dos cards (uso de `truncate` corta o texto em vez de quebrá-lo)

### Alterações

**1. `src/pages/CalendarPage.tsx`**
- Adicionar filtro `p.status !== 'archived'` nos projetos (já filtra `completed`)
- Adicionar filtro `t.status !== 'archived'` nas tarefas (já filtra `completed`/`done`)
- Adicionar badge "Atrasado" quando `item.status === 'overdue'`

**2. `src/pages/CollaboratorDashboard.tsx`**
- Adicionar filtro `p.status !== 'archived'` nos projetos
- Adicionar filtro `t.status !== 'archived'` nas tarefas

**3. `src/components/dashboard/UpcomingDeadlines.tsx`**
- Trocar `truncate` por `break-words line-clamp-2` no título e subtítulo para permitir quebra de linha sem extrapolar
- Adicionar badge "Atrasado" (vermelho) quando `item.status === 'overdue'`, ao lado da data/badge de tipo
- Garantir `overflow-hidden` no container pai

**4. `src/components/dashboard/ProximasEntregasPanel.tsx`**
- Já usa `ALLOWED_STATUSES` que exclui `completed`/`archived` -- sem alteração necessária neste arquivo


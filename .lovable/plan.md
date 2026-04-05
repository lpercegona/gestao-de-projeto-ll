

## Plano: Adicionar botão "Concluído" aos lembretes no calendário

### Problema

Lembretes não possuem campo `status` — quando estão atrasados, exibem o badge "Atrasado" mas não há como marcá-los como concluídos.

### Solução

1. **Migração**: Adicionar coluna `status` (default `'pending'`) à tabela `reminders`
2. **Interface**: Atualizar `Reminder` no `DataContext` para incluir `status`
3. **Botão de concluir**: Adicionar ícone `CheckCircle2` nos cards de lembrete (DashboardCalendar e CalendarPage) que atualiza o status para `'completed'`
4. **Filtros**: Lembretes com status `'completed'` são ocultados das listagens e dots do calendário

### Alterações

#### 1. Migração SQL
```sql
ALTER TABLE public.reminders 
  ADD COLUMN status text NOT NULL DEFAULT 'pending';
```

#### 2. `src/contexts/DataContext.tsx`
- Adicionar `status: 'pending' | 'completed'` à interface `Reminder`
- Filtrar lembretes com `status !== 'completed'` no fetch (ou manter e filtrar na UI)

#### 3. `src/pages/CalendarPage.tsx`
- No card de lembrete (linha ~338), antes do dropdown de ações, adicionar botão icon-only com `Check` que chama `supabase.from('reminders').update({ status: 'completed' })` e recarrega os dados
- Filtrar lembretes concluídos da listagem `allItems`

#### 4. `src/components/dashboard/DashboardCalendar.tsx`
- No card de lembrete (linha ~138), adicionar botão icon-only `Check` com a mesma lógica
- Filtrar lembretes concluídos dos dots e da lista de itens selecionados

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migração | `ALTER TABLE reminders ADD COLUMN status` |
| Editar | `src/contexts/DataContext.tsx` — interface Reminder |
| Editar | `src/pages/CalendarPage.tsx` — botão concluir + filtro |
| Editar | `src/components/dashboard/DashboardCalendar.tsx` — botão concluir + filtro |


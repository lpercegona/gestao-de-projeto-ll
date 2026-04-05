

## Plano: Completar Lembretes Recorrentes por Data Específica

### Problema

Ao marcar um lembrete mensal como "concluído", o sistema atualiza `status = 'completed'` no registro inteiro, ocultando **todas** as ocorrências futuras. O comportamento correto é concluir apenas a ocorrência daquela data específica, mantendo as próximas visíveis.

### Solução

Adicionar uma coluna `completed_dates` (array de datas) à tabela `reminders`. Ao concluir uma ocorrência de lembrete recorrente, a data é adicionada ao array em vez de alterar o `status` global. O `status = 'completed'` continua válido apenas para lembretes sem recorrência.

### Alterações

#### 1. Migração SQL

```sql
ALTER TABLE public.reminders 
  ADD COLUMN completed_dates date[] NOT NULL DEFAULT '{}';
```

#### 2. `src/contexts/DataContext.tsx`

- Adicionar `completed_dates: string[]` à interface `Reminder`

#### 3. `src/pages/CalendarPage.tsx`

- Na expansão de recorrência (linha 210): manter lembretes recorrentes visíveis mesmo com `status !== 'completed'` (já funciona), mas filtrar ocorrências cujas datas estejam em `completed_dates`
- No `handleCompleteReminder`: se o lembrete for recorrente, fazer `UPDATE reminders SET completed_dates = array_append(completed_dates, 'YYYY-MM-DD')` em vez de `status = 'completed'`
- Para lembretes sem recorrência, manter o comportamento atual (`status = 'completed'`)

#### 4. `src/components/dashboard/DashboardCalendar.tsx`

- Mesmo ajuste: filtrar ocorrências cujas datas estejam em `completed_dates`
- No `handleCompleteReminder`: verificar se é recorrente antes de decidir se atualiza `status` ou `completed_dates`

### Lógica de Filtragem

```typescript
// Para lembretes recorrentes, verificar se a data da ocorrência está em completed_dates
const isOccurrenceCompleted = (reminder, occurrenceDate) => {
  if (reminder.recurrence === 'none') return reminder.status === 'completed';
  return reminder.completed_dates?.includes(format(occurrenceDate, 'yyyy-MM-dd'));
};
```

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migração | `ALTER TABLE reminders ADD COLUMN completed_dates` |
| Editar | `src/contexts/DataContext.tsx` — interface Reminder |
| Editar | `src/pages/CalendarPage.tsx` — filtragem e conclusão por data |
| Editar | `src/components/dashboard/DashboardCalendar.tsx` — filtragem e conclusão por data |


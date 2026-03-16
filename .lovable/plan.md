## Plano: Recorrência de lembretes, edição/exclusão no card e novas opções no dropdown admin

### 1. Adicionar coluna `recurrence` na tabela `reminders`

Migration para adicionar campo de recorrência:

```sql
ALTER TABLE public.reminders ADD COLUMN recurrence text DEFAULT 'none';
-- Valores: 'none', 'monthly', 'yearly'
```

### 2. Atualizar interface `Reminder` no DataContext

Adicionar campo `recurrence: 'none' | 'monthly' | 'yearly'` à interface `Reminder`.

### 3. Expandir lembretes recorrentes no CalendarPage

No `allItems` (useMemo), ao processar lembretes com recorrência:

- **Mensal**: gerar uma instância virtual do lembrete para cada mês (mesmo dia) dentro de um intervalo razoável (ex: 12 meses à frente)
- **Anual**: gerar instância para o mesmo dia/mês nos próximos anos (ex: 2 anos à frente)

Os itens virtuais compartilham o mesmo `id` original mas com `due_date` ajustada, usando um sufixo no key para evitar duplicatas.

### 4. Adicionar campo de recorrência no diálogo de lembrete

No diálogo de criação/edição, adicionar um `Select` com as opções:

- Sem recorrência
- Mensal (mesmo dia, todo mês)
- Anual (mesmo dia e mês, todo ano)

### 5. Botões de edição e exclusão no card do lembrete

No `renderItemCard`, quando `item.type === 'reminder'` e `isAdminOrMaster`:

- Adicionar um `DropdownMenu` com ícone `MoreVertical` visível apenas com mousehover no card
- Opções: "Editar" (abre diálogo preenchido) e "Excluir" (com confirmação via toast ou dialog)
- O clique no dropdown deve usar `e.stopPropagation()` para não interferir com o card

### 6. Diálogo de edição de lembrete

Reutilizar o mesmo diálogo de criação, adicionando estado `editingReminderId` para distinguir criação vs edição. Ao salvar, chamar `updateReminder` em vez de `createReminder`.

### 7. Novas opções no dropdown "+" para admin

Adicionar ao `DropdownMenuContent` do botão "+" no painel da data:

- **Novo Projeto** → `navigate('/projects?new=true')` ou abrir diálogo inline
- **Nova Tarefa** → `navigate('/projects?newTask=true')` ou abrir diálogo inline
- **Novo Lembrete** (já existente)

Como os diálogos de projeto e tarefa já existem em `Projects.tsx` com lógica complexa, a abordagem mais prática é navegar para a página de projetos com query param para acionar a criação.

### Arquivos alterados

- `supabase/migrations/` — nova migration (coluna `recurrence`)
- `src/contexts/DataContext.tsx` — atualizar interface `Reminder`
- `src/pages/CalendarPage.tsx` — recorrência no diálogo, expansão virtual de lembretes, dropdown editar/excluir no card, opções projeto/tarefa no "+"
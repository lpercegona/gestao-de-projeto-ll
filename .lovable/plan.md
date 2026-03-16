

## Plano: Adicionar lembretes ao calendário (admin) e botão "+" no painel de data

### 1. Criar tabela `reminders` no banco de dados

Nova tabela com os campos:
- `id` (uuid, PK)
- `title` (text, NOT NULL)
- `reminder_date` (date, NOT NULL)
- `description` (text, nullable)
- `client_id` (uuid, nullable, FK → clients.id ON DELETE SET NULL)
- `owner_id` (uuid, NOT NULL) — quem criou
- `created_at` (timestamptz, default now())

RLS policies:
- Admin pode gerenciar lembretes onde `owner_id = auth.uid()`
- Master admin pode gerenciar todos os lembretes

### 2. Integrar lembretes no DataContext

- Adicionar interface `Reminder` e campo `reminders: Reminder[]` no `AppData`
- Buscar lembretes na query de dados (apenas para admin/master_admin)
- Adicionar funções CRUD no contexto

### 3. CalendarPage — Botão "+" para admin com dropdown

No painel de detalhes da data selecionada (lado direito):
- Adicionar botão "+" para admin (similar ao do cliente)
- Ao clicar, exibir dropdown com duas opções: "Nova Tarefa" e "Novo Lembrete"
- "Nova Tarefa" abre o fluxo existente de criação de tarefa
- "Novo Lembrete" abre diálogo dedicado

### 4. Diálogo "Novo Lembrete"

Campos:
- **Título** (obrigatório, input text)
- **Data** (obrigatória, date picker, pré-preenchida com a data selecionada)
- **Descrição** (opcional, textarea)
- **Cliente** (opcional, select com lista de clientes)

### 5. Exibir lembretes no CalendarPage

- Incluir lembretes no `allItems` (tipo `'reminder'`) com ícone diferenciado (Bell)
- Mostrar nos dots do calendário e na listagem da data selecionada
- Mostrar na lista "Próximas Entregas"

### 6. Exibir lembretes no DashboardCalendar

- Buscar lembretes diretamente no componente (ou via DataContext)
- Incluir lembretes nos dots e na listagem de itens da data selecionada
- Badge "Lembrete" com variante visual distinta

### Arquivos alterados
- `supabase/migrations/` — nova migration (tabela + RLS)
- `src/contexts/DataContext.tsx` — interface Reminder, fetch, CRUD
- `src/pages/CalendarPage.tsx` — botão admin, diálogo lembrete, integração nos items
- `src/components/dashboard/DashboardCalendar.tsx` — integração lembretes


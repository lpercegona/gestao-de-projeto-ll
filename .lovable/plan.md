

## Plano: 5 melhorias no calendário (dropdown cliente, fundo âmbar, ícones, pontos duplos, diálogos)

### 1. Dropdown de criação para usuário cliente no CalendarPage

Atualmente o cliente vê um botão "+" que abre direto o form de solicitação de projeto. Mudar para um `DropdownMenu` com 3 opções:
- **Projeto** → abre `ProjectRequestForm`
- **Tarefa** → abre `ProjectRequestForm` (ou navega com param)
- **Lembrete** → abre diálogo de lembrete (reutilizar o existente, habilitando para clientes também)

Labels sem "Novo/Nova": apenas "Projeto", "Tarefa", "Lembrete".

Também renomear as opções do dropdown admin de "Novo Projeto" → "Projeto", "Nova Tarefa" → "Tarefa", "Novo Lembrete" → "Lembrete".

**Arquivo**: `src/pages/CalendarPage.tsx` (linhas 463-491)

### 2. Fundo âmbar nos cards de lembretes

No `renderItemCard` do CalendarPage, quando `item.type === 'reminder'`, aplicar classe de fundo âmbar (`bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800`).

No DashboardCalendar, aplicar o mesmo estilo âmbar ao card de lembrete na listagem de itens selecionados.

**Arquivos**: `src/pages/CalendarPage.tsx`, `src/components/dashboard/DashboardCalendar.tsx`

### 3. Substituir labels de tipo por ícones

Remover os `Badge` de texto ("Projeto", "Tarefa", "Lembrete") e substituir pelos ícones correspondentes com a cor do tipo:
- Projeto: `FolderKanban` em cor primary
- Tarefa: `ListTodo` em cor secondary
- Lembrete: `Bell` em cor amber

Aplicar em:
- `getItemBadge` no CalendarPage → trocar Badge por ícone colorido
- Cards do DashboardCalendar → trocar `Badge` por ícone

**Arquivos**: `src/pages/CalendarPage.tsx`, `src/components/dashboard/DashboardCalendar.tsx`

### 4. Ponto âmbar no mini calendário do Dashboard

No `DayContent` do DashboardCalendar, separar lógica para detectar:
- `hasProjectOrTask`: se a data tem projetos/tarefas
- `hasReminder`: se a data tem lembretes

Renderizar até 2 pontos lado a lado:
- Ponto `bg-primary` se tem projeto/tarefa
- Ponto `bg-amber-500` se tem lembrete

**Arquivo**: `src/components/dashboard/DashboardCalendar.tsx`

### 5. Abrir diálogo de detalhe ao clicar em projeto/tarefa (CalendarPage + DashboardCalendar)

Esta é a mudança mais complexa. O `ProjectDetailDialogContent` e `TaskDetailDialogContent` estão definidos dentro de `ProjectTableView.tsx` e recebem muitas props (callbacks de edição, exclusão, timer, etc).

**Abordagem**: Ao clicar num card de projeto/tarefa no calendário, **navegar para a página do projeto** (comportamento atual) — isso já abre a visão completa. Para replicar o diálogo inline sem duplicar centenas de linhas, a abordagem pragmática é:

- Extrair `ProjectDetailDialogContent` e `TaskDetailDialogContent` de `ProjectTableView.tsx` para arquivos separados exportáveis
- No CalendarPage, importar esses componentes e abrir um `Dialog` com eles ao clicar, passando as props necessárias via `useData()` e callbacks simplificados
- No DashboardCalendar, ao clicar, navegar para `/projects/{id}` (manter simples dado o espaço limitado do card)

**Complexidade**: Este item exige extrair componentes, mapear props, e garantir funcionalidade completa (edição, timer, etc). É factível mas envolve refatoração significativa.

**Arquivos**: 
- `src/components/projects/ProjectDetailDialogContent.tsx` (novo, extraído)
- `src/components/projects/TaskDetailDialogContent.tsx` (novo, extraído)
- `src/components/projects/ProjectTableView.tsx` (importar dos novos arquivos)
- `src/pages/CalendarPage.tsx` (importar e usar os diálogos)
- `src/components/dashboard/DashboardCalendar.tsx` (navegação mantida para projeto)

### Arquivos alterados
- `src/pages/CalendarPage.tsx` — itens 1-5
- `src/components/dashboard/DashboardCalendar.tsx` — itens 2-4
- `src/components/projects/ProjectTableView.tsx` — refatorar extração de diálogos
- `src/components/projects/ProjectDetailDialogContent.tsx` — novo
- `src/components/projects/TaskDetailDialogContent.tsx` — novo


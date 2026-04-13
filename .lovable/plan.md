

## Plano: Adotar Sheet lateral como padrão para formulários de criação/edição

### Problema

Os formulários de criação e edição usam `Dialog` centrado. O padrão desejado é um **Sheet lateral** que ocupa ~1/4 da tela no desktop (lado direito) e tela inteira no mobile.

### Solução

1. **Criar componente `FormSheet`** — wrapper reutilizável que usa `Sheet` (side="right") com classes responsivas:
   - Desktop: `sm:max-w-[25vw] sm:min-w-[400px]` (1/4 da tela, mínimo 400px)
   - Mobile: `w-full h-full` (tela inteira)
   - Inclui header, área de conteúdo com scroll e footer

2. **Migrar cada formulário** de `Dialog`/`DialogContent` para `FormSheet`, mantendo o conteúdo interno inalterado.

### Componente FormSheet

```text
┌──────────────────────────────┐
│  Tela desktop                │ Sheet (25vw) ──┐
│                              │ ┌──────────────┤
│  Conteúdo da página          │ │ Título       │
│                              │ │ ──────────── │
│                              │ │ Formulário   │
│                              │ │ (scroll)     │
│                              │ │              │
│                              │ │ ──────────── │
│                              │ │ Botões       │
│                              │ └──────────────┤
└──────────────────────────────┘
```

### Arquivos a editar

| Ação | Arquivo | Formulários afetados |
|------|---------|---------------------|
| **Criar** | `src/components/ui/form-sheet.tsx` | Componente reutilizável |
| Editar | `src/pages/Proposals.tsx` | Nova/Editar proposta, editor de template |
| Editar | `src/pages/Clients.tsx` | Novo/Editar cliente |
| Editar | `src/pages/ClientProjects.tsx` | Criar/Editar projeto, criar/editar tarefa, registrar horas |
| Editar | `src/pages/ProjectDetail.tsx` | Criar/Editar tarefa, registrar horas |
| Editar | `src/pages/Services.tsx` | Novo/Editar serviço |
| Editar | `src/pages/Contracts.tsx` | Novo/Editar contrato |
| Editar | `src/pages/CalendarPage.tsx` | Novo lembrete/nota |
| Editar | `src/pages/Users.tsx` | Criar/Editar usuário |
| Editar | `src/components/users/UserCreateDialog.tsx` | Formulário criar usuário |
| Editar | `src/components/users/UserEditDialog.tsx` | Formulário editar usuário |
| Editar | `src/components/client/ClientCustomFieldsSection.tsx` | Criar/Editar campo personalizado |
| Editar | `src/components/dashboard/QuickActionsPanel.tsx` | Criação rápida de cliente |
| Editar | `src/components/dashboard/QuickRequestCard.tsx` | Criação rápida de tarefa |
| Editar | `src/components/projects/KanbanStagesDialog.tsx` | Gerenciar etapas Kanban |
| Editar | `src/components/reports/CustomMetricsConfigDialog.tsx` | Config métricas |
| Editar | `src/components/reports/ReportShareDialog.tsx` | Compartilhar relatório |
| Editar | `src/components/projects/ProjectShareDialog.tsx` | Compartilhar projeto |

### Não serão alterados

- **AlertDialogs** (confirmações de exclusão) — permanecem como estão
- **SettingsDialog** — já tem layout customizado
- **ExpandedTimerModal** — usa fullscreen proposital
- **GlobalTimerCompleteDialog** — diálogo simples de conclusão
- **Diálogos de visualização** (ProjectDetailDialogContent, TaskDetailDialogContent) — são painéis de detalhe, não formulários

### Detalhes técnicos

O `FormSheet` encapsulará `Sheet` + `SheetContent` com:
- `side="right"`
- Classes: `w-full h-full sm:w-[25vw] sm:min-w-[400px] sm:max-w-[500px]`
- Overflow interno com scroll
- Props: `open`, `onOpenChange`, `title`, `description`, `footer`, `children`

A migração em cada arquivo será mecânica: trocar imports de `Dialog*` por `FormSheet` e adaptar a estrutura JSX.




## Plano: Excluir tarefas de projetos arquivados das contagens do painel

### Problema

Tarefas pertencentes a projetos com status `archived` ainda são contadas nos painéis do Dashboard:

1. **Dashboard.tsx (linha 215)**: `pendingTasks` conta todas as tarefas pending/in_progress sem verificar o status do projeto pai
2. **DashboardCalendar.tsx (linhas 28-30 e 55-57)**: Exibe tarefas de projetos arquivados no calendário (filtra `task.status !== 'archived'` mas não verifica `project.status`)

**Nota**: O `ProximasEntregasPanel` já filtra corretamente via `ALLOWED_STATUSES`.

### Alterações

#### 1. `src/pages/Dashboard.tsx` — linha 215

Adicionar verificação do status do projeto pai:

```tsx
const pendingTasks = data.tasks.filter((t) => {
  const project = data.projects.find((p) => p.id === t.project_id);
  return (t.status === "pending" || t.status === "in_progress") &&
    !!project && project.status !== "archived";
});
```

#### 2. `src/components/dashboard/DashboardCalendar.tsx` — linhas 28-30 e 55-57

Adicionar `project.status !== 'archived'` nas duas iterações de tarefas:

```tsx
// Nas duas ocorrências de data.tasks.forEach:
if (t.due_date && t.status !== 'completed' && t.status !== 'archived') {
  const project = data.projects.find((p) => p.id === t.project_id);
  if (project && project.status !== 'archived') { // ← adicionar esta verificação
    ...
  }
}
```

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/Dashboard.tsx` — linha 215 |
| Editar | `src/components/dashboard/DashboardCalendar.tsx` — linhas 28-30 e 55-57 |


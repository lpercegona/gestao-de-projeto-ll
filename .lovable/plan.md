

## Plano: Corrigir Cálculos de Métricas Personalizadas nos Relatórios

### Problemas Identificados

1. **Dados não filtrados por mês**: O `CustomMetricsCard` recebe TODOS os projetos e tarefas do cliente, sem filtrar pelo período selecionado. A contagem/porcentagem deveria considerar apenas itens com atividade no mês escolhido.

2. **ClientDetail.tsx (linha 1581)**: Passa `data.tasks` completo (todas as tarefas do cliente), sem filtro de mês. Os projetos vêm de `reportData.projects` (filtrados por mês), mas as tarefas não.

3. **ClientReports.tsx (linha 715-716)**: Passa todos os projetos e tarefas do cliente sem filtro de mês.

4. **SharedReport.tsx (linha 681)**: Hardcoda `status: 'pending'` para todas as tarefas, tornando métricas de status de tarefas sempre incorretas. A RPC `get_shared_report_tasks` não retorna o campo `status`.

5. **Sem kanbanStages**: `ClientReports.tsx` e `SharedReport.tsx` não passam `kanbanStages` ao componente, impedindo métricas baseadas em estágios Kanban.

### Solução

#### 1. Filtrar dados pelo mês selecionado nos 3 contextos

Em cada página, passar ao `CustomMetricsCard` apenas os projetos e tarefas que tiveram horas registradas no mês selecionado (consistente com o "Resumo do Mês").

**ClientDetail.tsx**: Usar `reportData.projects` para projetos E extrair as tarefas de `reportData.projects[].tasks` (já filtradas por mês).

**ClientReports.tsx**: Aplicar a mesma lógica — filtrar projetos e tarefas que tenham time_entries no período selecionado.

**SharedReport.tsx**: Idem — usar os dados já processados de `reportData` para filtrar.

#### 2. Corrigir RPC `get_shared_report_tasks` para incluir `task_status`

Criar migração para alterar a função RPC adicionando `t.status as task_status` no retorno.

#### 3. Passar `kanbanStages` nos contextos faltantes

- **ClientReports.tsx**: Buscar kanban_stages do Supabase e passar ao componente.
- **SharedReport.tsx**: Criar RPC ou buscar kanban_stages e passar ao componente. Alternativa simples: não suportar kanban_stages em relatórios compartilhados (escopo limitado).

### Arquivos a Alterar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/ClientDetail.tsx` | Filtrar tasks passadas ao CustomMetricsCard usando `reportData.projects` |
| `src/pages/ClientReports.tsx` | Filtrar projects/tasks pelo mês selecionado; passar kanbanStages |
| `src/pages/SharedReport.tsx` | Filtrar projects/tasks pelo mês; usar status real das tasks |
| Migração SQL | Alterar `get_shared_report_tasks` para retornar `task_status` |

### Lógica de Filtragem (exemplo)

```typescript
// Projetos com atividade no mês = projetos presentes no reportData
const monthProjects = reportData.projects.map(p => ({
  id: p.id,
  name: p.name,
  status: p.status,
  custom_fields: p.custom_fields,
}));

// Tarefas com atividade no mês = tarefas dos projetos do reportData
const monthTasks = reportData.projects.flatMap(p =>
  p.tasks.map(t => ({ id: t.id, name: t.name, status: t.status, project_id: t.project_id }))
);
```

Isso garante que contagem e porcentagem reflitam apenas o período selecionado.


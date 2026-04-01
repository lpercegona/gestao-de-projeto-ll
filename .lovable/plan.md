

## Plano: Filtrar Métricas Personalizadas pelo Mês Selecionado

### Problema

Em todas as 3 páginas de relatório (`ClientDetail`, `ClientReports`, `SharedReport`), o `CustomMetricsCard` recebe **todos** os projetos e tarefas do cliente, ignorando o filtro de mês. Enquanto o card "Resumo do Mês" usa `reportData` (filtrado por período), as métricas personalizadas passam `data.projects` / `data.tasks` sem filtro.

### Solução

Substituir os dados passados ao `CustomMetricsCard` pelos projetos e tarefas já filtrados pelo mês em `reportData`.

### Alterações

#### 1. `src/pages/ClientDetail.tsx` (linha 1582-1583)

Trocar:
- `(data.projects || []).filter(p => p.client_id === clientId)` → projetos do `reportData.projects`
- `(data.tasks || []).filter(...)` → tarefas extraídas de `reportData.projects`

```tsx
<CustomMetricsCard
  metrics={customMetrics}
  projects={reportData.projects.map(p => ({ id: p.id, name: p.name, status: p.status, custom_fields: p.custom_fields as Record<string, string> | null }))}
  tasks={reportData.projects.flatMap(p => p.tasks.map(t => ({ id: t.id, name: t.name, status: t.status, project_id: t.project_id })))}
  kanbanStages={data.kanbanStages}
  projectColumns={clientId ? getClientColumns(clientId) : []}
/>
```

#### 2. `src/pages/ClientReports.tsx` (linhas 715-716)

Mesmo padrão — usar `reportData` (que neste arquivo é o array filtrado por mês) em vez de `projects.filter(...)`.

#### 3. `src/pages/SharedReport.tsx` (linhas 684-685)

Mesmo padrão — usar `reportData` filtrado.

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/ClientDetail.tsx` — linhas 1582-1583 |
| Editar | `src/pages/ClientReports.tsx` — linhas 715-716 |
| Editar | `src/pages/SharedReport.tsx` — linhas 684-685 |


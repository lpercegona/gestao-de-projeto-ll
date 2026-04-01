

## Plano: Corrigir Cálculo de Porcentagem — Baseado em Horas, Não Contagem

### Problema

O `CustomMetricsCard.computeMetric` calcula porcentagem como `matchCount / totalItems` — ou seja, conta **quantidade de projetos/tarefas**. No caso "% de esforço por vertical Box group", isso dá 57.1% (ex: 4 de 7 projetos). Mas o usuário espera a porcentagem baseada em **horas trabalhadas no período** (68.03%).

Para métricas de "esforço", a porcentagem precisa ser: `horasDosProjetos_matching / horasTotais_no_mês`.

### Solução

Passar os `timeEntries` filtrados pelo mês ao `CustomMetricsCard` e usar horas para calcular porcentagens.

### Alterações

#### 1. `CustomMetricsCard.tsx` — Adicionar prop `timeEntries` e recalcular

- Nova interface `TimeEntry` com `{ task_id, hours, project_id }`
- Nova prop `timeEntries` no componente
- No `computeMetric`, quando `display_type === 'percentage'`:
  - Calcular `totalHours` = soma de todas as horas dos timeEntries
  - Calcular `matchHours` = soma das horas dos timeEntries cujos projetos/tarefas correspondem ao filtro da métrica
  - Retornar `(matchHours / totalHours * 100).toFixed(1)%`
- Para `display_type === 'count'`, manter a lógica atual (contagem de itens)

#### 2. `ClientDetail.tsx` — Passar timeEntries filtrados

Adicionar prop `timeEntries` ao `CustomMetricsCard` com os time entries do mês, enriquecidos com `project_id`:

```tsx
timeEntries={data.timeEntries
  .filter(te => {
    const d = new Date(te.date);
    return d >= monthStart && d <= monthEnd &&
      reportData.projects.some(p => p.id === /* project do te */);
  })
  .map(te => ({ task_id: te.task_id, hours: Number(te.hours), project_id: /* lookup */ }))}
```

Para resolver o `project_id` de cada time entry, fazer lookup via `data.tasks`.

#### 3. `ClientReports.tsx` e `SharedReport.tsx` — Mesmo padrão

Passar `timeEntries` filtrados pelo mês ao componente.

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/reports/CustomMetricsCard.tsx` — adicionar prop timeEntries, usar horas para % |
| Editar | `src/pages/ClientDetail.tsx` — passar timeEntries filtrados |
| Editar | `src/pages/ClientReports.tsx` — passar timeEntries filtrados |
| Editar | `src/pages/SharedReport.tsx` — passar timeEntries filtrados |


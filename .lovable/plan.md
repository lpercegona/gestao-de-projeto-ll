## Plano: Corrigir Métricas e Adicionar Blocos com Títulos Personalizáveis

### Problema 1: Blocos/Cards com títulos personalizáveis

Atualmente todas as métricas ficam em um único card com título fixo "Métricas Personalizadas". O usuário quer poder criar múltiplos blocos, cada um com seu título.

**Solução**: Adicionar campo `block_title` à tabela `report_custom_metrics`. Métricas com o mesmo `block_title` são agrupadas no mesmo card. O título do card é o `block_title`. Remover ícone BarChart3 e título fixo.

### Alterações

#### 1. Migração SQL

```sql
ALTER TABLE report_custom_metrics ADD COLUMN block_title text NOT NULL DEFAULT '';
```

Atualizar a RPC `get_shared_report_custom_metrics` para retornar `block_title`.

#### 2. `CustomMetricsConfigDialog.tsx`

- Adicionar campo "Título do bloco" por métrica (input texto)
- Botão "Adicionar bloco" cria nova métrica com bloco novo
- Métricas são agrupadas visualmente por `block_title`

#### 3. `CustomMetricsCard.tsx`

- Remover título fixo "Métricas Personalizadas" e ícone BarChart3
- Agrupar métricas por `block_title`
- Renderizar um Card por grupo, com `block_title` como título (se preenchido, senão sem header)

#### 4. `ClientDetail.tsx`, `ClientReports.tsx`, `SharedReport.tsx`

- Passar TODOS os projetos do cliente (não apenas os do `reportData`) e TODAS as tarefas
- ClientDetail: usar `clientProjects` + `data.tasks.filter(t => clientProjects has t.project_id)`
- ClientReports: usar `projects` + `tasks` do DataContext (já filtrados por RLS)
- SharedReport: usar `projects` (já retorna todos do cliente) + `tasks`

### Arquivos


| Ação     | Arquivo                                                |
| -------- | ------------------------------------------------------ |
| Migração | Adicionar `block_title` + atualizar RPC                |
| Editar   | `src/components/reports/CustomMetricsCard.tsx`         |
| Editar   | `src/components/reports/CustomMetricsConfigDialog.tsx` |
| Editar   | `src/pages/ClientDetail.tsx`                           |
| Editar   | `src/pages/ClientReports.tsx`                          |
| Editar   | `src/pages/SharedReport.tsx`                           |



## Plano: Métricas Personalizadas nos Relatórios

### Conceito

Criar uma tabela `report_custom_metrics` que armazena métricas configuráveis por cliente. Cada métrica define: um label, a entidade-alvo (projetos ou tarefas), um campo de categoria (pré-definido como `status` ou baseado em `project_columns`/`kanban_stages` do cliente), um valor de categoria específico, e o tipo de exibição (contagem ou porcentagem). O admin configura essas métricas via diálogo acessível na aba Relatórios do perfil do cliente. O card "Métricas Personalizadas" aparece nos 3 contextos de relatório.

### 1. Nova tabela: `report_custom_metrics`

```sql
CREATE TABLE public.report_custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label text NOT NULL,
  entity_type text NOT NULL DEFAULT 'projects',  -- 'projects' | 'tasks'
  category_source text NOT NULL DEFAULT 'status', -- 'status' | 'custom_field' | 'kanban_stage'
  category_field_id uuid NULL,  -- references project_columns.id when source='custom_field'
  category_value text NOT NULL, -- the specific category value to count/percentage
  display_type text NOT NULL DEFAULT 'count', -- 'count' | 'percentage'
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL
);

ALTER TABLE public.report_custom_metrics ENABLE ROW LEVEL SECURITY;

-- Admin can manage metrics for own clients
CREATE POLICY "Admin can manage own client metrics" ON public.report_custom_metrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- Master admin full access
CREATE POLICY "Master admin can manage all metrics" ON public.report_custom_metrics
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()));

-- Clients can view own metrics
CREATE POLICY "Clients can view own metrics" ON public.report_custom_metrics
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client') AND client_id = get_user_client_id(auth.uid()));
```

### 2. RPC para relatório compartilhado

Criar função `get_shared_report_custom_metrics(p_token text)` que retorna as métricas do cliente vinculado ao token, similar às outras funções `get_shared_report_*`.

### 3. Diálogo de configuração (Admin)

**Arquivo novo**: `src/components/reports/CustomMetricsConfigDialog.tsx`

- Botão de settings (ícone engrenagem) na mesma linha dos botões Download e Share, na aba Relatórios do `ClientDetail.tsx`
- Abre diálogo com lista das métricas existentes e botão "Adicionar métrica"
- Formulário por métrica: Label, Entidade (projetos/tarefas), Fonte da categoria (Status / Campo personalizado / Estágio Kanban), Valor da categoria (select com opções dinâmicas), Tipo de exibição (contagem/porcentagem)
- As opções de "Valor da categoria" são populadas dinamicamente:
  - Status: ['active', 'completed', 'paused', 'cancelled', ...]
  - Campo personalizado: options do `project_columns` do tipo `select`
  - Estágio Kanban: nomes dos `kanban_stages`

### 4. Card "Métricas Personalizadas" nos Relatórios

**Componente novo**: `src/components/reports/CustomMetricsCard.tsx`

- Recebe: lista de métricas configuradas, projetos, tarefas, project_columns, kanban_stages
- Para cada métrica, calcula contagem ou porcentagem filtrado pelo mês selecionado
- Renderizado como Card com grid similar aos cards de resumo existentes

**Integrar em 3 locais**:
1. `ClientDetail.tsx` — após card "Resumo do Mês" na aba Relatórios (+ botão settings no header)
2. `ClientReports.tsx` — após card "Resumo do Mês" (sem botão settings)
3. `SharedReport.tsx` — após card "Resumo do Mês" (sem botão settings, busca via RPC)

### 5. Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/reports/CustomMetricsConfigDialog.tsx` |
| Criar | `src/components/reports/CustomMetricsCard.tsx` |
| Migração | Nova tabela `report_custom_metrics` + RLS + RPC |
| Editar | `src/pages/ClientDetail.tsx` — botão settings + card |
| Editar | `src/pages/ClientReports.tsx` — card |
| Editar | `src/pages/SharedReport.tsx` — card + fetch via RPC |


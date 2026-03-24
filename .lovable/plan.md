

## Plano: Corrigir Erro de `block_title` e Reestruturar UX de Blocos

### Problema

1. **Erro de banco**: A coluna `block_title` não existe na tabela `report_custom_metrics`. A migração anterior apenas atualizou a RPC mas não executou o `ALTER TABLE ADD COLUMN`.
2. **UX inadequada**: O fluxo atual é "adicionar métrica avulsa com campo de título de bloco". O usuário espera criar um **bloco** (com título) e dentro dele adicionar métricas.

### Solução

#### 1. Migração SQL — Adicionar coluna `block_title`

```sql
ALTER TABLE public.report_custom_metrics 
  ADD COLUMN IF NOT EXISTS block_title text NOT NULL DEFAULT '';
```

#### 2. Reestruturar `CustomMetricsConfigDialog.tsx`

Novo fluxo de UX:
- Métricas são exibidas **agrupadas por `block_title`**
- Cada grupo é um card visual com o título do bloco editável no topo
- Dentro de cada bloco, botão "Adicionar métrica" para adicionar ao bloco
- Botão principal "Adicionar bloco" cria um novo grupo com título vazio e uma métrica em branco
- Botão de remover bloco (remove todas as métricas do bloco)
- Botão de remover métrica individual dentro do bloco

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migração | `ALTER TABLE ... ADD COLUMN block_title` |
| Editar | `src/components/reports/CustomMetricsConfigDialog.tsx` — reestruturar para fluxo bloco → métricas |


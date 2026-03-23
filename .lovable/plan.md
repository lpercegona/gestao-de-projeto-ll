

## Plano: Corrigir Métricas Personalizadas — Lookup por ID vs Nome

### Problema Raiz

Os `custom_fields` dos projetos são armazenados com a **chave sendo o UUID do column** (ex: `{ "abc-123-uuid": "DNAsec" }`), mas o `CustomMetricsCard.computeMetric` faz lookup pelo **nome da coluna** (`fields?.[col.name]`). Isso causa match zero, resultando em contagens e porcentagens sempre zeradas para métricas baseadas em campos personalizados.

**Evidência**: Em `Projects.tsx`, os campos são salvos como `custom_fields[column.id]` (linhas 1621-1643), ou seja, a chave é o UUID. Porém em `CustomMetricsCard.tsx` linha 79, o código faz `fields?.[col.name]`, buscando pelo nome textual da coluna.

### Solução

Alterar `CustomMetricsCard.tsx` para buscar pelo **ID da coluna** em vez do nome. A correção é simples — trocar `col.name` por `col.id` nas duas ocorrências dentro de `computeMetric`:

**Arquivo**: `src/components/reports/CustomMetricsCard.tsx`

Linha 79: `fields?.[col.name]` → `fields?.[col.id]`
Linha 87: `fields?.[col.name]` → `fields?.[col.id]`

Isso corrige o cálculo nos 3 contextos (ClientDetail, ClientReports, SharedReport) pois todos usam o mesmo componente.

### Arquivos a Alterar

| Arquivo | Mudança |
|---------|---------|
| `src/components/reports/CustomMetricsCard.tsx` | Trocar `col.name` por `col.id` nas linhas 79 e 87 |


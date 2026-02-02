
## Plano: Correções do Sistema de Modelo de Contratação e Adição de Duração de Contrato

### Problema Identificado

A coluna `contract_type` **não existe no banco de dados**. A migração anterior atualizou apenas a função RPC mas não adicionou a coluna à tabela `clients`. Isso está causando comportamentos inconsistentes em toda a plataforma.

Além disso, faltam campos para gerenciar a duração do contrato (início, término, meses) que são necessários para calcular corretamente as horas totais em contratos mensais.

---

### Alterações Necessárias

#### 1. Migração do Banco de Dados

Adicionar as seguintes colunas à tabela `clients`:

```sql
-- Adicionar coluna de tipo de contrato
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'one_time';

-- Adicionar campos de período do contrato
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_months INTEGER DEFAULT 1;
```

Também criar a tabela de histórico mensal:

```sql
CREATE TABLE IF NOT EXISTS client_hours_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  contracted_hours INTEGER NOT NULL,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, period_year, period_month)
);
```

---

#### 2. Interface Client (DataContext.tsx)

Atualizar a interface `Client` para incluir:
- `contract_type`
- `contract_start_date`
- `contract_end_date`  
- `contract_months`

---

#### 3. Página de Listagem de Clientes (Clients.tsx)

**Modificações nos Cards:**
- Calcular horas utilizadas baseado no tipo de contrato (mensal = mês atual)
- Adicionar badge de tipo de contrato (Serviço Único / Plano Mensal)
- Mostrar período do contrato quando definido
- Ajustar barra de progresso para responder ao tipo de contrato

```text
┌─────────────────────────────────────────┐
│ Nome da Empresa                         │
│ email@empresa.com                       │
│                                         │
│ 🏷️ Plano Mensal  📅 Jan/26 - Dez/26    │
│                                         │
│ Projetos: 5                             │
│ Horas: 15h / 20h (mês atual)           │
│ [████████████░░░░░░░░░░░░░░░░░] 75%    │
└─────────────────────────────────────────┘
```

---

#### 4. Formulário de Edição de Cliente (Clients.tsx + ClientDetail.tsx)

Adicionar campos ao formulário:
- Modelo de Contratação (Select: Serviço Único / Plano Mensal)
- Data de Início do Contrato (DatePicker)
- Data de Término do Contrato (DatePicker)
- Duração em Meses (Input number - calculado automaticamente ou manual)

---

#### 5. Dashboard Admin (Dashboard.tsx)

**Seção "Horas por Cliente":**
- Para clientes mensais: mostrar horas do mês atual
- Adicionar badge "Mensal" no card
- Ajustar cálculo da barra de progresso

---

#### 6. Dashboard do Cliente (ClientDashboard.tsx)

Já implementado parcialmente, mas precisa:
- Buscar campos de período do banco
- Mostrar informações de período quando disponível

---

#### 7. Perfil do Cliente (ClientDetail.tsx)

**Visão Geral (Cards de métricas):**
- Para planos mensais: calcular total de horas do contrato
  ```
  Total do Contrato = contracted_hours × contract_months
  ```
- Barra de progresso responde ao total (não apenas ao mês)
- Exibir período do contrato

---

#### 8. Relatório Compartilhado (SharedReport.tsx)

**Resumo do Contrato:**
- Para planos mensais: exibir horas do mês selecionado vs horas contratadas/mês
- Adicionar período do contrato
- Progress bar responde ao filtro de mês

---

#### 9. Relatórios Admin (Reports.tsx)

**Vista por Cliente:**
- Para clientes mensais: exibir horas do mês selecionado
- Badge indicando tipo de contrato
- Ajustar cálculo de "Restante" para considerar mês

---

#### 10. Contrato Público (PublicContract.tsx)

- Adicionar exibição do tipo de contratação
- Mostrar duração do contrato

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `Nova migração SQL` | Adicionar colunas `contract_type`, `contract_start_date`, `contract_end_date`, `contract_months` |
| `src/contexts/DataContext.tsx` | Atualizar interface Client com novos campos |
| `src/types/index.ts` | Atualizar interface Client |
| `src/pages/Clients.tsx` | Cards com tipo de contrato, período e horas mensais |
| `src/pages/ClientDetail.tsx` | Campos no formulário de edição + métricas ajustadas |
| `src/pages/Dashboard.tsx` | Horas por cliente respeitando tipo de contrato |
| `src/pages/ClientDashboard.tsx` | Ajustes para período do contrato |
| `src/pages/Reports.tsx` | Badge de tipo e horas mensais para clientes mensais |
| `src/pages/SharedReport.tsx` | Resumo do contrato com horas do mês selecionado |
| `src/pages/PublicContract.tsx` | Exibir tipo de contratação |

---

### Lógica de Cálculo

**Para Serviço Único (one_time):**
```
Horas Totais = Todas as time_entries desde o início
Contratado = contracted_hours
```

**Para Plano Mensal (monthly):**
```
Horas do Mês = time_entries filtradas pelo mês/ano selecionado
Contratado/Mês = contracted_hours
Total do Contrato = contracted_hours × contract_months
```

---

### Fluxo Visual

```text
CARDS NA LISTAGEM:
┌──────────────────────────────────────────┐
│ Empresa ABC                              │
│ contato@empresaabc.com                   │
│                                          │
│ 🔄 Plano Mensal    📅 Jan - Dez 2026    │
│                                          │
│ Projetos: 3                              │
│ Horas (Fev/2026): 12h / 20h             │
│ [█████████████░░░░░░░░░░░░░░░░░] 60%    │
└──────────────────────────────────────────┘

PERFIL DO CLIENTE:
┌──────────────────────────────────────────┐
│ VISÃO GERAL DO CONTRATO                  │
│                                          │
│ Tipo: Plano Mensal                       │
│ Período: Jan/2026 - Dez/2026 (12 meses) │
│                                          │
│ Horas/Mês: 20h                           │
│ Total do Contrato: 240h (12 × 20h)       │
│                                          │
│ Utilizado até agora: 45h                 │
│ [███░░░░░░░░░░░░░░░░░░░░░░░░░░░] 19%    │
└──────────────────────────────────────────┘
```

---

### Seção Técnica

**Nova lógica de cálculo de horas totais do contrato:**
```typescript
const getTotalContractHours = (client: Client) => {
  if (client.contract_type === 'monthly') {
    const months = client.contract_months || 1;
    return client.contracted_hours * months;
  }
  return client.contracted_hours;
};
```

**Função para calcular horas restantes considerando período:**
```typescript
const getContractRemainingHours = (client: Client, totalUsed: number) => {
  const totalContract = getTotalContractHours(client);
  return Math.max(0, totalContract - totalUsed);
};
```

---

### Ordem de Implementação

1. **Migração do banco** - Adicionar colunas faltantes
2. **DataContext.tsx** - Atualizar interface e busca de dados
3. **ClientDetail.tsx** - Campos de edição + exibição ajustada
4. **Clients.tsx** - Cards com informações de contrato
5. **Dashboard.tsx** - Horas mensais para clientes mensais
6. **Reports.tsx** - Ajustes na vista por cliente
7. **SharedReport.tsx** - Resumo do contrato com mês
8. **ClientDashboard.tsx** - Verificar consistência
9. **PublicContract.tsx** - Tipo de contratação

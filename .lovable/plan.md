

## Plano: Sistema de Banco de Horas para Contratos Mensais

### Contexto

Para clientes com contratos mensais que ultrapassam as horas contratadas em um mês, o sistema precisa:
1. Identificar e exibir as horas excedentes como "banco de horas negativo" ou "saldo devedor"
2. Contabilizar essas horas no próximo mês como "horas herdadas"
3. Segmentar claramente entre horas do mês atual e horas herdadas de meses anteriores

### Nomenclatura Sugerida

Sugiro utilizar o termo **"Saldo Anterior"** para as horas excedentes que são transportadas:
- **Saldo Anterior**: Horas que excederam o limite do mês passado e são descontadas do mês atual
- **Horas do Mês**: Horas utilizadas especificamente neste mês
- **Horas Disponíveis**: Total de horas que podem ser usadas (contratadas - saldo anterior)

Alternativas consideradas:
- "Horas Acumuladas" - pode confundir com horas já usadas
- "Débito de Horas" - tem conotação negativa
- "Crédito Utilizado" - pode confundir com crédito positivo

---

### Alterações Necessárias

#### 1. Criar Função de Cálculo de Saldo Anterior (DataContext.tsx)

Adicionar nova função `getClientPreviousMonthOverflow`:

```typescript
// Calcula as horas que excederam no mês anterior (saldo negativo transportado)
const getClientPreviousMonthOverflow = (clientId: string, year?: number, month?: number): number => {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;
  
  // Calcula para o mês anterior
  let prevYear = targetYear;
  let prevMonth = targetMonth - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  
  // Verifica se o cliente tem contrato mensal
  const client = data.clients.find(c => c.id === clientId);
  if (!client || client.contract_type !== 'monthly') return 0;
  
  // Calcula horas usadas no mês anterior
  const prevMonthHours = getClientMonthlyHours(clientId, prevYear, prevMonth);
  const overflow = Math.max(0, prevMonthHours - client.contracted_hours);
  
  // Recursivamente adiciona overflow de meses anteriores
  const prevOverflow = getClientPreviousMonthOverflow(clientId, prevYear, prevMonth);
  
  return overflow + prevOverflow;
};
```

---

#### 2. Interface do DataContext

Atualizar a interface `DataContextType`:

```typescript
interface DataContextType {
  // ... existentes
  getClientPreviousMonthOverflow: (clientId: string, year?: number, month?: number) => number;
}
```

---

#### 3. Dashboard do Cliente (ClientDashboard.tsx)

**Modificar o card de horas para mostrar:**

```text
┌────────────────────────────────────────────────────────────────────┐
│ Horas do Mês - Fevereiro de 2026                    [Plano Mensal] │
│                                                                    │
│ Horas Disponíveis: 15h (20h contratadas - 5h saldo anterior)      │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Horas do Mês: 12h                                            │  │
│ │ Saldo Anterior: 5h                                           │  │
│ │ Total Utilizado: 17h                                         │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ [███████████████████████████████████████████░░░░░░░░░░] 85%       │
│ 3h restantes este mês                                              │
│                                                                    │
│ ⚠️ Se exceder, 2h serão descontadas do próximo mês                │
└────────────────────────────────────────────────────────────────────┘
```

**Campos a exibir:**
- **Saldo Anterior**: X horas (quando > 0)
- **Horas do Mês**: Y horas
- **Horas Disponíveis**: contracted_hours - saldo_anterior
- **Restantes**: disponíveis - horas_do_mês

---

#### 4. Perfil do Cliente (ClientDetail.tsx)

**Card de utilização mensal:**

```text
┌────────────────────────────────────────────────────────────────────┐
│ Utilização - Fevereiro de 2026                      [Plano Mensal] │
│                                                                    │
│ Contratado: 20h/mês                                                │
│ Saldo Anterior: 5h (excedente de Janeiro)                         │
│ Disponível este mês: 15h                                          │
│                                                                    │
│ Horas do Mês: 12h                                                  │
│ [████████████████████░░░░░░] 80%                                   │
│                                                                    │
│ 3h restantes este mês                                              │
└────────────────────────────────────────────────────────────────────┘
```

---

#### 5. Dashboard Admin (Dashboard.tsx)

**Seção "Horas por Cliente" - adicionar indicador de saldo:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ Empresa ABC                              [Mensal] [⚠️ Saldo: 5h] │
│ 12h / 20h (15h disponíveis)                                     │
│ [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 80%         │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 6. Listagem de Clientes (Clients.tsx)

**Cards com indicador de saldo anterior:**

```text
┌──────────────────────────────────────────┐
│ Empresa ABC                              │
│ contato@empresaabc.com                   │
│                                          │
│ 🔄 Plano Mensal    📅 Jan - Dez 2026    │
│ ⚠️ Saldo anterior: 5h                   │
│                                          │
│ Projetos: 3                              │
│ Horas (Fev/2026): 12h / 15h disponíveis │
│ [█████████████░░░░░░░░░░░░░░░░░] 80%    │
└──────────────────────────────────────────┘
```

---

#### 7. Relatório Compartilhado (SharedReport.tsx)

**Resumo do contrato com saldo:**

```text
┌────────────────────────────────────────────────────────────────────┐
│ RESUMO DO CONTRATO                                                 │
│                                                                    │
│ Tipo: Plano Mensal                                                 │
│ Período: Jan/2026 - Dez/2026                                      │
│ Horas/Mês: 20h                                                     │
│                                                                    │
│ ── Mês Selecionado: Fevereiro de 2026 ──                          │
│                                                                    │
│ Saldo Anterior: 5h                                                 │
│ Horas Disponíveis: 15h                                             │
│ Horas Utilizadas: 12h                                              │
│ Restantes: 3h                                                      │
│                                                                    │
│ [████████████████████░░░░░░░] 80%                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/contexts/DataContext.tsx` | Adicionar função `getClientPreviousMonthOverflow` |
| `src/pages/ClientDashboard.tsx` | Exibir saldo anterior e horas do mês separadamente |
| `src/pages/ClientDetail.tsx` | Card de utilização com saldo anterior |
| `src/pages/Dashboard.tsx` | Indicador de saldo na seção "Horas por Cliente" |
| `src/pages/Clients.tsx` | Cards com informação de saldo anterior |
| `src/pages/SharedReport.tsx` | Resumo do contrato com saldo por mês |
| `src/pages/Reports.tsx` | Vista por cliente com saldo |

---

### Lógica de Cálculo

```typescript
// Para um cliente mensal:
const contractedHours = client.contracted_hours;         // 20h
const previousOverflow = getClientPreviousMonthOverflow(clientId); // 5h (do mês passado)
const availableHours = Math.max(0, contractedHours - previousOverflow); // 15h
const currentMonthHours = getClientMonthlyHours(clientId);  // 12h
const remainingHours = Math.max(0, availableHours - currentMonthHours); // 3h

// Se currentMonthHours > availableHours:
const newOverflow = currentMonthHours - availableHours; // Será transportado pro próximo mês
```

---

### Fluxo Visual

```text
MÊS JANEIRO (20h contratadas):
├── Utilizado: 25h
├── Excedente: 5h → Transportado para Fevereiro
└── Saldo para Fevereiro: -5h

MÊS FEVEREIRO (20h contratadas):
├── Saldo Anterior: 5h
├── Disponível: 15h (20h - 5h)
├── Utilizado no mês: 12h
├── Restante: 3h
└── Total considerado: 17h (12h + 5h saldo)

MÊS MARÇO (se Fevereiro não exceder):
├── Saldo Anterior: 0h
├── Disponível: 20h
└── ...
```

---

### Seção Técnica

**Nova função no DataContext:**

```typescript
const getClientPreviousMonthOverflow = (
  clientId: string, 
  year?: number, 
  month?: number
): number => {
  const client = data.clients.find(c => c.id === clientId);
  if (!client || client.contract_type !== 'monthly') return 0;

  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  // Verifica se o contrato já começou
  if (client.contract_start_date) {
    const startDate = new Date(client.contract_start_date);
    const targetDate = new Date(targetYear, targetMonth - 1, 1);
    if (targetDate <= startDate) return 0; // Antes do início do contrato
  }

  // Calcula mês anterior
  let prevYear = targetYear;
  let prevMonth = targetMonth - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  // Horas usadas no mês anterior
  const prevMonthHours = getClientMonthlyHours(clientId, prevYear, prevMonth);
  
  // Saldo anterior do mês anterior (recursivo até início do contrato)
  const prevOverflow = getClientPreviousMonthOverflow(clientId, prevYear, prevMonth);
  
  // Horas disponíveis no mês anterior
  const prevAvailable = Math.max(0, client.contracted_hours - prevOverflow);
  
  // Excedente do mês anterior
  const overflow = Math.max(0, prevMonthHours - prevAvailable);

  return overflow;
};
```

**Atualização da interface:**

```typescript
interface DataContextType {
  // ... existentes
  getClientPreviousMonthOverflow: (clientId: string, year?: number, month?: number) => number;
}
```

---

### Ordem de Implementação

1. **DataContext.tsx** - Adicionar função `getClientPreviousMonthOverflow`
2. **ClientDashboard.tsx** - Exibir saldo anterior e segmentação de horas
3. **ClientDetail.tsx** - Card de utilização com saldo
4. **Dashboard.tsx** - Indicador de saldo na lista de clientes
5. **Clients.tsx** - Cards com informação de saldo
6. **SharedReport.tsx** - Resumo do contrato com saldo por mês
7. **Reports.tsx** - Vista por cliente com saldo


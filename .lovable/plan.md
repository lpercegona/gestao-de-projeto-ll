

# Implementar Saldo Positivo de Horas Remanescentes em Contratos Mensais

## Contexto

Atualmente, o sistema so transporta **horas excedentes** (saldo negativo) de um mes para o outro. Se um cliente usa menos horas do que o contratado, essas horas nao utilizadas sao perdidas. O objetivo e que horas remanescentes tambem sejam acumuladas como bonus para o proximo mes.

**Exemplo atual** (10h contratadas/mes):
- Janeiro: usou 12h -> overflow = 2h -> Fevereiro disponivel = 8h
- Janeiro: usou 6h -> overflow = 0h -> Fevereiro disponivel = 10h (4h perdidas)

**Comportamento desejado**:
- Janeiro: usou 12h -> saldo = +2h -> Fevereiro disponivel = 8h
- Janeiro: usou 6h -> saldo = -4h -> Fevereiro disponivel = 14h (4h extras)

## Alteracao Principal

### 1. `src/contexts/DataContext.tsx` -- Funcao `getClientPreviousMonthOverflow`

Renomear conceitualmente o calculo de "overflow" para "saldo liquido" (balance). A variavel `overflow` passara a aceitar valores negativos (representando horas remanescentes acumuladas):

```text
Logica atual (linha 995):
  overflow = Math.max(0, usedHours - availableHours)
  // Descarta horas nao usadas

Logica nova:
  overflow = overflow + usedHours - client.contracted_hours
  overflow = Math.max(0, overflow)  // Nunca permitir saldo negativo alem de zero
```

**Correcao**: Na verdade, para permitir acumulo positivo E negativo:

```text
// availableHours = contracted + bonus (se overflow negativo)
availableHours = client.contracted_hours + Math.max(0, -overflow)
overflow = usedHours - availableHours
// Se positivo: excedeu. Se negativo: sobrou.
// Mas limitar o bonus acumulado para nao crescer infinitamente? 
// Nao -- o usuario quer acumulo real.
```

A logica simplificada sera:

```text
for each month from start to target-1:
  available = contracted_hours + carryover  (carryover de horas sobrando)
  balance = used - available
  if balance > 0:  // usou mais que disponivel
    carryover = 0
    overflow = balance
  else:            // sobrou horas
    carryover = -balance  (horas que sobram)
    overflow = 0

return overflow - carryover  
// positivo = desconto, negativo = bonus
```

Na verdade, o mais limpo e unificar em uma unica variavel `balance`:

```typescript
let balance = 0; // positivo = deve horas, negativo = tem credito
for each month:
  const available = Math.max(0, contracted_hours - balance);
  balance = balance + usedHours - contracted_hours;
  // Equivalente: balance += (usedHours - contracted_hours)
```

Espera -- a logica atual ja faz quase isso. O problema e so o `Math.max(0, ...)` na linha 995 que impede valores negativos. Removendo isso e ajustando os consumidores:

**Mudanca real na linha 995:**
```typescript
// ANTES:
overflow = Math.max(0, usedHours - availableHours);

// DEPOIS:
overflow = usedHours - availableHours;
```

Isso faz com que `overflow` fique negativo quando sobram horas (credito).

A linha 994 (`availableHours = Math.max(0, contracted_hours - overflow)`) ja trata corretamente: se overflow e negativo (credito), available = contracted + credito.

### 2. Ajustar Consumidores -- Apresentacao do Saldo

Nos 6 arquivos que consomem `previousOverflow`, a logica `availableHours = Math.max(0, contracted - overflow)` ja funciona automaticamente para valores negativos (o resultado sera contracted + |credito|).

As mudancas visuais necessarias sao nos indicadores de saldo, que hoje so mostram quando `previousOverflow > 0`. Precisam mostrar tambem quando `previousOverflow < 0` (credito):

**Arquivos afetados:**

- **`HorasPorClientePanel.tsx`** -- Badge "Saldo" deve mostrar tanto debito quanto credito
- **`ClientDetail.tsx`** -- Indicador de saldo anterior
- **`Dashboard.tsx`** -- Indicador de saldo para clientes
- **`Reports.tsx`** -- Alerta de saldo anterior
- **`ClientReports.tsx`** -- Saldo no relatorio do cliente
- **`SharedReport.tsx`** -- Saldo no relatorio compartilhado

Para cada um:
- Onde hoje exibe `previousOverflow > 0` com icone de alerta (amber), adicionar condicao `previousOverflow < 0` com icone de bonus (verde), exibindo "Credito: Xh Ymin"
- A formula `availableHours = Math.max(0, contracted - overflow)` permanece identica (ja funciona para ambos os cenarios)

### 3. Resumo das Mudancas por Arquivo

| Arquivo | Mudanca |
|---|---|
| `DataContext.tsx` | Remover `Math.max(0, ...)` da linha 995 |
| `HorasPorClientePanel.tsx` | Badge verde para credito |
| `ClientDetail.tsx` | Indicador verde de credito |
| `Dashboard.tsx` | Indicador verde de credito |
| `Reports.tsx` | Alerta verde de credito |
| `ClientReports.tsx` | Indicador verde de credito |
| `SharedReport.tsx` | Texto de credito no resumo |

### Detalhes Tecnicos

A unica mudanca de logica e na linha 995 do DataContext:
```typescript
// DE:
overflow = Math.max(0, usedHours - availableHours);
// PARA:
overflow = usedHours - availableHours;
```

Isso permite que `overflow` fique negativo (credito acumulado). A linha 994 ja calcula `availableHours = Math.max(0, contracted - overflow)`, que com overflow negativo resulta em `contracted + credito` -- exatamente o comportamento desejado.

Nos consumidores, o padrao visual sera:
- `previousOverflow > 0`: Badge/alerta amber "Saldo Anterior: Xh" (debito, como hoje)
- `previousOverflow < 0`: Badge/alerta verde "Credito: Xh" (horas bonus)
- `previousOverflow === 0`: Nada exibido


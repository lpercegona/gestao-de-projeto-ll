

## Plano: Corrigir Arredondamento de 1 Minuto no Cálculo de Saldo

### Problema

O cálculo de horas acumula valores `float` via `reduce((sum, e) => sum + Number(e.hours), 0)` sem arredondamento. Erros de ponto flutuante (ex: `0.1 + 0.2 = 0.30000000000000004`) se propagam pelo loop iterativo de saldo em `getClientPreviousMonthOverflow`, onde o overflow de cada mês alimenta o próximo. Após vários meses, o erro acumulado ultrapassa `0.008333...` (0.5 minuto em decimal), fazendo `Math.round(fraction * 60)` pular 1 minuto a mais no `formatHours`.

### Solução

Arredondar para 2 casas decimais em dois pontos críticos:

1. **`getClientMonthlyHours`** (linha 985): arredondar o resultado do reduce
2. **`getClientPreviousMonthOverflow`** (linha 1028): arredondar o overflow a cada iteração do loop

### Alterações

**Arquivo**: `src/contexts/DataContext.tsx`

**Linha 979-985** — Arredondar soma:
```typescript
const raw = data.timeEntries
  .filter(...)
  .reduce((sum, e) => sum + Number(e.hours), 0);
return Math.round(raw * 100) / 100;
```

**Linha 1028** — Arredondar overflow a cada iteração:
```typescript
overflow = Math.round((usedHours - availableHours) * 100) / 100;
```

Isso elimina a propagação de erros de ponto flutuante e garante que o saldo e o resumo reflitam os valores corretos.

### Arquivo

| Ação | Arquivo |
|------|---------|
| Editar | `src/contexts/DataContext.tsx` — linhas 985 e 1028 |


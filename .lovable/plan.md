
## Plano: corrigir arredondamento de 1 minuto no saldo mensal

### Diagnóstico (causa raiz)
- O sistema soma horas em decimal (`Number(e.hours)`) e só converte para minutos na exibição.
- Em pontos críticos, ainda há arredondamento para **2 casas decimais** (`getClientMonthlyHours` e `getClientPreviousMonthOverflow`).
- Como **1 minuto = 0,016666...h**, essa base decimal gera resíduos e “flip” de 1 minuto no saldo (carry-over mensal).
- Existem cálculos duplicados em páginas de relatório que ainda somam `hours` decimais diretamente, causando inconsistência entre telas.

### Implementação proposta
1. **Padronizar cálculos em minutos inteiros**
   - Criar helper (ex.: `src/lib/timeMath.ts`) com:
     - `toMinutes(hours) => Math.round(Number(hours) * 60)`
     - `toHours(minutes) => minutes / 60`
     - utilitário de soma por entradas em minutos.
   - Regra: toda regra de negócio (usado/disponível/saldo) roda em minutos; converte para horas apenas no retorno/render.

2. **Refatorar DataContext (fonte principal de saldo)**
   - Atualizar `getTaskHours`, `getProjectHours`, `getClientHours`, `getClientMonthlyHours` para somar por minutos.
   - Reescrever `getClientPreviousMonthOverflow` com `overflowMinutes` no loop mensal:
     - `availableMinutes = contractedMinutes - overflowMinutes`
     - `overflowMinutes = usedMinutes - availableMinutes`
   - Remover arredondamento por 2 casas nesses fluxos.

3. **Alinhar formatação final**
   - Ajustar `formatHours` para calcular a string a partir de `totalMinutes = Math.round(abs(hours) * 60)`, evitando dupla interpretação da fração decimal.

4. **Unificar cálculo nas telas de relatório**
   - Trocar somas `reduce(... + Number(te.hours))` por helper de minutos em:
     - `src/pages/ClientDetail.tsx`
     - `src/pages/ClientReports.tsx`
     - `src/pages/Reports.tsx`
     - `src/pages/SharedReport.tsx` (incluindo overflow local)
   - Garantir que Dashboard, Perfil do Cliente e relatórios usem a mesma lógica.

### Validação (caso Box Group)
- Mês anterior com horas executadas = disponíveis → saldo do mês seguinte deve ficar **0h** (sem +1min fantasma).
- Ao adicionar +1min em lançamento: saldo varia exatamente -1min.
- Ao retirar -1min no mesmo lançamento: saldo retorna exatamente +1min.
- Conferir paridade dos números entre Dashboard, ClientDetail, ClientReports e SharedReport.

### Arquivos previstos
- `src/lib/timeMath.ts` (novo)
- `src/contexts/DataContext.tsx`
- `src/lib/formatHours.ts`
- `src/pages/ClientDetail.tsx`
- `src/pages/ClientReports.tsx`
- `src/pages/Reports.tsx`
- `src/pages/SharedReport.tsx`

### Detalhes técnicos
- Unidade canônica: **minutos inteiros**.
- Conversões:
  - Entrada decimal/hh:mm → `toMinutes`
  - Cálculo interno → inteiro
  - Saída UI → `toHours` + `formatHours`
- Sem mudança de banco nesta etapa; a correção fica na camada de cálculo para estabilizar o arredondamento no produto inteiro.

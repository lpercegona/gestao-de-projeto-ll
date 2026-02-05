

## Plano: Padronizar Visualização de Relatórios entre Admin e Cliente

### Problema Identificado

O componente `ClientReports.tsx` utiliza queries diretas ao Supabase e não inclui:

1. **Cálculo de horas mensais** para contratos do tipo `monthly`
2. **Saldo anterior** (overflow de meses anteriores)
3. **Badge de tipo de contrato** (Mensal/Único)
4. **Resumo dinâmico** que responde ao tipo de contrato
5. **Alerta de saldo anterior** quando há excedente

Enquanto o `Reports.tsx` do admin usa o `DataContext` que possui todas essas funcionalidades prontas.

---

### Solução

Refatorar `ClientReports.tsx` para:
1. Usar `useData()` do `DataContext` em vez de queries diretas
2. Reutilizar a mesma lógica de cálculo do admin
3. Adicionar os campos visuais ausentes

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ClientReports.tsx` | Refatorar para usar `useData()` e adicionar campos do admin |

---

### Alterações Detalhadas

**1. Importações**
```typescript
// Adicionar
import { useData } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

// Remover queries manuais do Supabase para dados principais
```

**2. Usar DataContext**
```typescript
export const ClientReports: React.FC = () => {
  const { user } = useAuth();
  const { 
    data, 
    loading, 
    getClientColumns, 
    getClientMonthlyHours, 
    getClientPreviousMonthOverflow 
  } = useData();
  
  // Buscar cliente atual
  const client = useMemo(() => {
    if (!data.clients.length) return null;
    // Para clientes, o DataContext já filtra apenas seus dados via RLS
    return data.clients[0] || null;
  }, [data.clients]);
  
  // Usar data.projects, data.tasks, data.timeEntries do contexto
  const projects = data.projects;
  const tasks = data.tasks;
  const timeEntries = data.timeEntries;
  const projectColumns = data.projectColumns;
```

**3. Adicionar Badge de Tipo de Contrato no Header**
```typescript
{/* No Card de Resumo do Contrato */}
<div className="flex items-center gap-2">
  <CardTitle>Resumo do Contrato</CardTitle>
  <Badge variant={client.contract_type === 'monthly' ? "default" : "secondary"}>
    {client.contract_type === 'monthly' ? (
      <><RefreshCw className="w-3 h-3 mr-1" />Mensal</>
    ) : (
      <><Clock className="w-3 h-3 mr-1" />Único</>
    )}
  </Badge>
</div>
```

**4. Adicionar Cálculo de Overflow para Contratos Mensais**
```typescript
const [year, month] = selectedMonth.split('-').map(Number);
const isMonthly = client.contract_type === 'monthly';

const previousOverflow = isMonthly 
  ? getClientPreviousMonthOverflow(client.id, year, month) 
  : 0;

const monthlyHours = isMonthly 
  ? getClientMonthlyHours(client.id, year, month) 
  : 0;

const availableHours = isMonthly 
  ? Math.max(0, client.contracted_hours - previousOverflow) 
  : client.contracted_hours;

const displayedUsedHours = isMonthly ? monthlyHours : totalAllHours;
const remainingHours = Math.max(0, availableHours - displayedUsedHours);
```

**5. Atualizar Card de Resumo do Contrato**
```typescript
<CardContent>
  <div className="grid gap-4 md:grid-cols-5">
    <div>
      <p className="text-sm text-muted-foreground">
        {isMonthly ? 'Disponível' : 'Horas Contratadas'}
      </p>
      <p className="text-2xl font-bold text-foreground">
        {formatHours(availableHours)}
      </p>
      {isMonthly && previousOverflow > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatHours(client.contracted_hours)} - {formatHours(previousOverflow)}
        </p>
      )}
    </div>
    <div>
      <p className="text-sm text-muted-foreground">
        {isMonthly ? 'Usado no Mês' : 'Total Utilizado'}
      </p>
      <p className="text-2xl font-bold text-foreground">
        {formatHours(displayedUsedHours)}
      </p>
    </div>
    <div>
      <p className="text-sm text-muted-foreground">Horas em Tarefas</p>
      <p className="text-2xl font-bold text-primary">
        {formatHours(totalMonthTaskHours)}
      </p>
    </div>
    <div>
      <p className="text-sm text-muted-foreground">Horas em Reuniões</p>
      <p className="text-2xl font-bold text-accent-foreground">
        {formatHours(totalMonthMeetingHours)}
      </p>
    </div>
    <div>
      <p className="text-sm text-muted-foreground">
        {isMonthly ? 'Restante do Mês' : 'Restante'}
      </p>
      <p className="text-2xl font-bold text-foreground">
        {formatHours(remainingHours)}
      </p>
    </div>
  </div>
  
  {/* Alerta de Saldo Anterior */}
  {isMonthly && previousOverflow > 0 && (
    <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 mt-4">
      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
          Saldo Anterior: {formatHours(previousOverflow)}
        </p>
        <p className="text-xs text-muted-foreground">
          Horas excedentes do mês anterior descontadas do limite deste mês
        </p>
      </div>
    </div>
  )}
  
  {/* Barra de Progresso */}
  <div className="w-full bg-muted rounded-full h-3 mt-4">
    <div
      className="bg-primary h-3 rounded-full transition-all"
      style={{ 
        width: `${availableHours > 0 
          ? Math.min((displayedUsedHours / availableHours) * 100, 100) 
          : 0}%` 
      }}
    />
  </div>
</CardContent>
```

**6. Usar getClientColumns do DataContext**
```typescript
// Remover fetch manual de project_columns
// Usar getClientColumns(clientId) do DataContext
const clientColumns = client ? getClientColumns(client.id) : [];

// Filtrar apenas os marcados para exibição em relatório
const visibleColumns = clientColumns.filter(col => col.show_in_report);
```

---

### Resultado Esperado

| Campo | Antes | Depois |
|-------|-------|--------|
| Tipo de Contrato | Não exibido | Badge "Mensal" ou "Único" |
| Horas Disponíveis | Apenas `contracted_hours` | `contracted_hours - saldoAnterior` para mensais |
| Saldo Anterior | Não exibido | Alerta quando há excedente |
| Horas Usadas | Total acumulado | Mês atual para mensais, total para únicos |
| Labels | Fixos | Dinâmicos conforme tipo de contrato |
| Colunas | 3 | 5 (igual ao admin) |

---

### Segurança

As políticas RLS existentes já garantem que:
- Clientes só veem seus próprios dados via `get_user_client_id()`
- `DataContext` respeita essas políticas automaticamente


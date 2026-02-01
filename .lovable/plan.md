

## Plano: Sistema de Modelo de Contratação (Serviço Único vs Plano Mensal)

Este plano implementa a diferenciação entre dois modelos de contratação de clientes, afetando a forma como as horas são calculadas, exibidas e registradas historicamente.

---

### Visão Geral dos Modelos

| Modelo | Comportamento |
|--------|---------------|
| **Serviço Único (one_time)** | Horas contratadas são fixas e acumulativas. Consumo total desde o início. |
| **Plano Mensal (monthly)** | Horas renovam a cada mês. Histórico mantido por período. Reset automático. |

---

### Alterações no Banco de Dados

#### 1. Nova coluna na tabela `clients`

```sql
ALTER TABLE clients 
ADD COLUMN contract_type TEXT NOT NULL DEFAULT 'one_time';

-- Valores válidos: 'one_time' (serviço único) ou 'monthly' (plano mensal)
```

#### 2. Nova tabela para histórico mensal de horas

```sql
CREATE TABLE client_hours_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  contracted_hours INTEGER NOT NULL,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  task_hours NUMERIC NOT NULL DEFAULT 0,
  meeting_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, period_year, period_month)
);

-- Habilitar RLS
ALTER TABLE client_hours_history ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admin can manage own client history"
ON client_hours_history FOR ALL
USING (has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM clients c WHERE c.id = client_hours_history.client_id AND c.owner_id = auth.uid()
));

CREATE POLICY "Master admin can manage all history"
ON client_hours_history FOR ALL
USING (is_master_admin(auth.uid()));

CREATE POLICY "Clients can view own history"
ON client_hours_history FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));
```

#### 3. Trigger para consolidar histórico mensal

```sql
CREATE OR REPLACE FUNCTION consolidate_monthly_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_month INTEGER;
  v_year INTEGER;
  v_contract_type TEXT;
  v_contracted_hours INTEGER;
BEGIN
  -- Obter client_id através de task -> project -> client
  SELECT p.client_id, c.contract_type, c.contracted_hours
  INTO v_client_id, v_contract_type, v_contracted_hours
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  WHERE t.id = NEW.task_id;

  IF v_client_id IS NULL OR v_contract_type != 'monthly' THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM NEW.date);
  v_month := EXTRACT(MONTH FROM NEW.date);

  -- Upsert histórico mensal
  INSERT INTO client_hours_history (client_id, period_year, period_month, contracted_hours, used_hours, task_hours, meeting_hours)
  VALUES (v_client_id, v_year, v_month, v_contracted_hours, NEW.hours, 
    CASE WHEN NEW.entry_type = 'task' THEN NEW.hours ELSE 0 END,
    CASE WHEN NEW.entry_type = 'meeting' THEN NEW.hours ELSE 0 END)
  ON CONFLICT (client_id, period_year, period_month)
  DO UPDATE SET
    used_hours = client_hours_history.used_hours + NEW.hours,
    task_hours = client_hours_history.task_hours + CASE WHEN NEW.entry_type = 'task' THEN NEW.hours ELSE 0 END,
    meeting_hours = client_hours_history.meeting_hours + CASE WHEN NEW.entry_type = 'meeting' THEN NEW.hours ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_consolidate_monthly_hours
AFTER INSERT ON time_entries
FOR EACH ROW EXECUTE FUNCTION consolidate_monthly_hours();
```

---

### Alterações na Interface do Cliente

#### Arquivo: `src/contexts/DataContext.tsx`

Atualizar interface do Client:

```typescript
interface Client {
  // ... campos existentes
  contract_type: 'one_time' | 'monthly';
}
```

Adicionar nova função para horas do mês atual:

```typescript
const getClientMonthlyHours = (clientId: string, year?: number, month?: number): number => {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;
  
  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 0);
  
  return data.timeEntries
    .filter(e => {
      const entryDate = new Date(e.date);
      const task = data.tasks.find(t => t.id === e.task_id);
      const project = task ? data.projects.find(p => p.id === task.project_id) : null;
      return project?.client_id === clientId && 
             entryDate >= monthStart && 
             entryDate <= monthEnd;
    })
    .reduce((sum, e) => sum + Number(e.hours), 0);
};
```

---

### Alterações na UI

#### 1. Formulário de Edição de Cliente (`ClientDetail.tsx`)

Adicionar campo de seleção do tipo de contratação:

```tsx
<div className="space-y-2">
  <Label>Modelo de Contratação</Label>
  <Select 
    value={editFormData.contract_type} 
    onValueChange={(v) => setEditFormData({...editFormData, contract_type: v})}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="one_time">Serviço Único</SelectItem>
      <SelectItem value="monthly">Plano Mensal</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    {editFormData.contract_type === 'monthly' 
      ? 'Horas renovam automaticamente a cada mês' 
      : 'Horas acumulativas desde o início do contrato'}
  </p>
</div>
```

#### 2. Exibição de Horas no ClientDetail

Modificar a seção de métricas para mostrar diferente baseado no tipo:

```tsx
{/* Para clientes mensais */}
{client.contract_type === 'monthly' ? (
  <Card>
    <CardContent className="py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Plano Mensal</Badge>
          <span className="text-sm text-muted-foreground">
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <span className="font-medium">
          {formatHours(monthlyUsedHours)} / {formatHours(client.contracted_hours)}
        </span>
      </div>
      <Progress value={monthlyPercentage} />
      <p className="text-xs text-muted-foreground mt-1">
        {formatHours(client.contracted_hours - monthlyUsedHours)} restantes este mês
      </p>
    </CardContent>
  </Card>
) : (
  // Exibição atual para serviço único
)}
```

#### 3. Dashboard Admin (`Dashboard.tsx`)

Modificar exibição de horas por cliente para respeitar o tipo:

```tsx
{client.contract_type === 'monthly' && (
  <Badge variant="outline" className="text-xs ml-2">Mensal</Badge>
)}
```

#### 4. ClientDashboard (área do cliente)

Modificar para exibir horas do mês atual quando aplicável:

```tsx
const monthlyUsedHours = clientInfo?.contract_type === 'monthly' 
  ? getClientMonthlyHours(clientInfo.id)
  : usedHours;
```

#### 5. Relatórios (`Reports.tsx`)

Adicionar indicador visual do tipo de contratação e exibir histórico mensal quando aplicável.

#### 6. SharedReport

Atualizar a função RPC `get_shared_report` para incluir `contract_type`:

```sql
-- Adicionar ao retorno da função
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.company as client_company,
  c.logo_url as client_logo_url,
  c.contracted_hours,
  c.contract_type,  -- NOVO
  rs.is_public
FROM report_shares rs
JOIN clients c ON c.id = rs.client_id
WHERE rs.share_token = p_token AND rs.is_public = true;
```

Exibir no relatório compartilhado:

```tsx
<div>
  <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
  <p className="text-lg font-semibold">
    {clientInfo.contract_type === 'monthly' ? 'Plano Mensal' : 'Serviço Único'}
  </p>
</div>
```

#### 7. Contrato Público (`PublicContract.tsx`)

Exibir o tipo de contratação no resumo do contrato.

---

### Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| **Migrations** | Nova coluna `contract_type` em clients, nova tabela `client_hours_history`, trigger |
| `src/contexts/DataContext.tsx` | Adicionar interface e função `getClientMonthlyHours` |
| `src/pages/ClientDetail.tsx` | Campo de seleção do tipo + exibição condicional de horas |
| `src/pages/Dashboard.tsx` | Badge indicando tipo de contratação |
| `src/pages/ClientDashboard.tsx` | Exibir horas do mês quando mensal |
| `src/pages/Reports.tsx` | Indicador visual e suporte a histórico |
| `src/pages/SharedReport.tsx` | Exibir tipo de contratação |
| `src/pages/PublicContract.tsx` | Exibir tipo de contratação |
| Funções RPC | Atualizar `get_shared_report` para incluir `contract_type` |

---

### Fluxo de Exibição por Modelo

```text
SERVIÇO ÚNICO (one_time):
┌────────────────────────────────────────┐
│ Horas Contratadas: 100h                │
│ Horas Utilizadas: 45h (desde início)   │
│ Disponível: 55h                        │
│ [████████████░░░░░░░░░░░░░░░░░] 45%   │
└────────────────────────────────────────┘

PLANO MENSAL (monthly):
┌────────────────────────────────────────┐
│ 🔄 Plano Mensal - Janeiro 2026         │
│ Horas do Mês: 20h contratadas          │
│ Utilizadas: 8h / 20h                   │
│ Disponível este mês: 12h               │
│ [████████░░░░░░░░░░░░░░░░░░░░░] 40%   │
│                                        │
│ 📊 Ver histórico de meses anteriores   │
└────────────────────────────────────────┘
```

---

### Comportamento do Reset Mensal

Para clientes com `contract_type = 'monthly'`:

1. **Cálculo de horas**: Filtra `time_entries` pelo mês/ano atual
2. **Histórico**: A tabela `client_hours_history` mantém registro consolidado por período
3. **Relatórios**: Podem mostrar comparativo mês a mês
4. **Não há ação automática de reset** - o cálculo é dinâmico baseado na data

---

### Seção Técnica

**Lógica de cálculo dinâmico (sem job):**
- Horas mensais são calculadas em tempo real filtrando `time_entries` pelo período
- A tabela `client_hours_history` serve apenas para histórico/relatórios rápidos
- Trigger consolida automaticamente quando novo time_entry é inserido

**Compatibilidade retroativa:**
- Clientes existentes terão `contract_type = 'one_time'` por padrão
- Comportamento atual permanece inalterado para esses clientes

**Performance:**
- Índice recomendado: `CREATE INDEX idx_time_entries_date ON time_entries(date);`
- Histórico pré-calculado evita recálculos pesados em relatórios


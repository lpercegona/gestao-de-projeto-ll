
## Plano: Adicionar Edição de Período de Contrato e Exibição "Contrato vai até..."

### Problema Identificado

Os campos de período do contrato (`contract_start_date`, `contract_end_date`, `contract_months`) já existem no banco de dados, mas:

1. **Não estão incluídos no formulário de edição do cliente** (`ClientDetail.tsx`)
2. **Não são exibidos no perfil do cliente** (falta informação "Contrato vai até...")
3. **O `editFormData` não inclui esses campos**, então não são salvos ao editar

---

### Alterações Necessárias

#### 1. Atualizar Estado do Formulário de Edição (ClientDetail.tsx)

Adicionar os campos de período ao `editFormData`:

```typescript
const [editFormData, setEditFormData] = useState({
  // ... campos existentes
  contract_type: 'one_time' as 'one_time' | 'monthly',
  contract_start_date: null as string | null,  // NOVO
  contract_end_date: null as string | null,    // NOVO
  contract_months: 1 as number | null,         // NOVO
});
```

---

#### 2. Atualizar useEffect de Inicialização

Modificar o `useEffect` que inicializa o formulário para incluir os novos campos:

```typescript
useEffect(() => {
  if (client) {
    setEditFormData({
      // ... campos existentes
      contract_type: (client as any).contract_type || 'one_time',
      contract_start_date: (client as any).contract_start_date || null,  // NOVO
      contract_end_date: (client as any).contract_end_date || null,      // NOVO
      contract_months: (client as any).contract_months || 1,             // NOVO
    });
  }
}, [client]);
```

---

#### 3. Adicionar Campos no Diálogo de Edição

Incluir uma nova seção no formulário (dentro da aba "Dados Gerais") para editar o período do contrato:

**Layout proposto:**

```text
┌────────────────────────────────────────────────────────┐
│ MODELO DE CONTRATAÇÃO                                  │
│                                                        │
│ [Plano Mensal ▼]     [Horas/Mês: 20]                  │
│                                                        │
│ ── Período do Contrato ──                              │
│                                                        │
│ Início: [📅 01/01/2026]    Término: [📅 31/12/2026]   │
│                                                        │
│ Duração: [12] meses                                    │
│ (Total do contrato: 240h = 20h × 12 meses)            │
└────────────────────────────────────────────────────────┘
```

**Campos a adicionar:**
- DatePicker para `contract_start_date`
- DatePicker para `contract_end_date`
- Input numérico para `contract_months`

**Comportamento:**
- Campos de período só aparecem quando `contract_type === 'monthly'`
- Calcular automaticamente `contract_months` quando as datas são selecionadas
- Mostrar resumo: "Total do contrato: Xh (horas × meses)"

---

#### 4. Adicionar Exibição "Contrato vai até..." no Perfil

Modificar a seção de dados básicos do cliente para incluir a informação de término do contrato:

**Localização:** Card de dados básicos (linhas 872-900)

```text
┌──────────────────────────────────────────────────────────────────┐
│ Responsável  │ E-mail          │ Telefone │ Origem │ Status      │
│ João Silva   │ joao@email.com  │ (11)...  │ Google │ 🟢 Ativo   │
│                                                                  │
│ Modelo: Plano Mensal          │ Contrato vai até: Dez/2026      │
└──────────────────────────────────────────────────────────────────┘
```

**Condição:**
- Mostrar "Contrato vai até: MMM/YYYY" somente quando `contract_end_date` estiver definido

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/ClientDetail.tsx` | Adicionar campos de período no formulário + exibição no perfil |

---

### Componentes Necessários

Os componentes já existem no projeto:
- `Popover` + `Calendar` para DatePicker
- `format` do date-fns para formatação de datas

**Import adicional necessário:**
```typescript
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
```

---

### Detalhes de Implementação

#### Estrutura do Formulário (nova seção após "Modelo de Contratação"):

```tsx
{/* Período do contrato - apenas para planos mensais */}
{editFormData.contract_type === 'monthly' && (
  <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
    <h4 className="text-sm font-medium">Período do Contrato</h4>
    <div className="grid grid-cols-2 gap-4">
      {/* Data de Início */}
      <div className="space-y-2">
        <Label>Data de Início</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {editFormData.contract_start_date 
                ? format(new Date(editFormData.contract_start_date), "dd/MM/yyyy")
                : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={editFormData.contract_start_date ? new Date(editFormData.contract_start_date) : undefined}
              onSelect={(date) => setEditFormData({...editFormData, contract_start_date: date?.toISOString().split('T')[0] || null})}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Data de Término */}
      <div className="space-y-2">
        <Label>Data de Término</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {editFormData.contract_end_date 
                ? format(new Date(editFormData.contract_end_date), "dd/MM/yyyy")
                : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={editFormData.contract_end_date ? new Date(editFormData.contract_end_date) : undefined}
              onSelect={(date) => setEditFormData({...editFormData, contract_end_date: date?.toISOString().split('T')[0] || null})}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
    
    {/* Duração em meses */}
    <div className="space-y-2">
      <Label>Duração (meses)</Label>
      <Input
        type="number"
        min="1"
        value={editFormData.contract_months || 1}
        onChange={(e) => setEditFormData({...editFormData, contract_months: Number(e.target.value)})}
      />
      <p className="text-xs text-muted-foreground">
        Total do contrato: {formatHours((editFormData.contracted_hours || 0) * (editFormData.contract_months || 1))} 
        ({editFormData.contracted_hours}h × {editFormData.contract_months || 1} meses)
      </p>
    </div>
  </div>
)}
```

#### Exibição no Card de Dados Básicos:

```tsx
{/* Adicionar ao grid de informações básicas */}
{isMonthly && (
  <>
    <div>
      <span className="text-xs text-muted-foreground">Modelo</span>
      <p className="text-sm font-medium text-foreground">Plano Mensal</p>
    </div>
    {(client as any).contract_end_date && (
      <div>
        <span className="text-xs text-muted-foreground">Contrato vai até</span>
        <p className="text-sm font-medium text-foreground">
          {format(new Date((client as any).contract_end_date), "MMM/yyyy", { locale: ptBR })}
        </p>
      </div>
    )}
  </>
)}
```

---

### Fluxo Visual Final

**Perfil do Cliente:**
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ EMPRESA ABC                                                    [✏️]     │
│ Descrição do cliente...                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ 📁 Projetos: 5  │ ⏱ Horas do Mês: 15h  │ ⏱ Horas/Mês: 20h  │ 🕐 Restante: 5h │
├──────────────────────────────────────────────────────────────────────────┤
│ Utilização - Fevereiro de 2026            [Plano Mensal]    15h de 20h  │
│ [███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 75%       │
│ Total acumulado: 45h desde o início do contrato                         │
├──────────────────────────────────────────────────────────────────────────┤
│ Responsável  │ E-mail      │ Telefone │ Origem │ Status  │ Modelo       │ Contrato até │
│ João Silva   │ joao@...    │ (11)...  │ Google │ Ativo   │ Plano Mensal │ Dez/2026    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Formulário de Edição:**
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ EDITAR CLIENTE                                               [X]        │
├──────────────────────────────────────────────────────────────────────────┤
│ [Dados Gerais] [Campos Personalizados]                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ Nome: [João Silva]           Empresa: [ABC Ltda]                         │
│ Email: [joao@...]            Telefone: [(11)...]                         │
│ Status: [Ativo ▼]            Origem: [Google]                            │
│                                                                          │
│ Horas Contratadas: [20]      Modelo: [Plano Mensal ▼]                   │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ PERÍODO DO CONTRATO                                                 │ │
│ │                                                                     │ │
│ │ Início: [📅 01/01/2026]        Término: [📅 31/12/2026]            │ │
│ │                                                                     │ │
│ │ Duração: [12] meses                                                 │ │
│ │ Total do contrato: 240h (20h × 12 meses)                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Observações: [WYSIWYG Editor]                                            │
│                                                                          │
│                                        [Cancelar] [Salvar]               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Ordem de Implementação

1. Adicionar imports necessários (Calendar, Popover, CalendarIcon)
2. Atualizar `editFormData` com os campos de período
3. Atualizar `useEffect` de inicialização do formulário
4. Adicionar seção de período no formulário de edição
5. Adicionar exibição "Contrato vai até" no card de dados básicos
6. Testar salvamento e exibição dos dados

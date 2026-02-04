

## Plano: Ajustes no Layout do Painel

### Alterações Solicitadas

1. **QuickActionsPanel** - Combinar botões + timer em um único card
2. **Remover PageHeader** - Sem título e descrição do painel
3. **Stats** - Remover card de "Horas", adicionar card customizável com +
4. **Projetos** - Mostrar apenas projetos ativos
5. **Tarefas** - Mostrar apenas tarefas pendentes

---

### 1. QuickActionsPanel Reorganizado

**Novo Layout:**
```text
┌────────────────────────────────────────┐
│ + Ações Rápidas                        │
├────────────────────────────────────────┤
│ [+ Novo Cliente] [+ Nova Proposta]     │  ← Mesma linha
│                                        │
│       00:00:00                         │  ← Timer (sem título)
│  [Tarefa vinculada info]               │
│  [▶️ Iniciar] ou [⏸ Pausar][⏹ Concluir]│
└────────────────────────────────────────┘
```

**Modificação em `QuickActionsPanel.tsx`:**
- Adicionar lógica do timer inline (importar de GlobalTimerContext)
- Botões lado a lado: `grid grid-cols-2 gap-2`
- Remover título "Registro Rápido" do timer

---

### 2. Dashboard.tsx - Remover PageHeader

**Antes:**
```typescript
<PageHeader
  title="Painel"
  description="Visão geral do sistema de gestão de projetos"
/>
```

**Depois:** Remover completamente este componente.

---

### 3. Stats Row - Substituir "Horas" por Card Customizável

**Novo array de stats (4 cards + 1 customizável):**
```typescript
const stats = [
  {
    title: 'Clientes',
    value: data.clients.length,
    icon: Users,
    description: 'Total de clientes',
  },
  {
    title: 'Projetos',
    value: activeProjects.length,  // ← Apenas ativos
    icon: FolderKanban,
    description: 'Projetos ativos',
  },
  {
    title: 'Tarefas',
    value: pendingTasks.length,    // ← Apenas pendentes
    icon: ListTodo,
    description: 'Tarefas pendentes',
  },
  {
    title: 'Propostas',
    value: proposalCount,
    icon: FileCheck,
    description: 'Pendentes ou enviadas',
  },
];
```

**Card customizável (5ª posição):**
```typescript
{/* Card customizável com bordas pontilhadas */}
<Card className="border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer">
  <CardContent className="flex items-center justify-center h-full p-4 min-h-[100px]">
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <Plus className="h-6 w-6" />
      <span className="text-xs">Personalizar</span>
    </div>
  </CardContent>
</Card>
```

---

### 4. Filtros de Dados

**Projetos Ativos:**
```typescript
const activeProjects = data.projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
```

**Tarefas Pendentes:**
```typescript
const pendingTasks = data.tasks.filter(t => t.status !== 'completed' && t.status !== 'done');
```

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/dashboard/QuickActionsPanel.tsx` | Integrar timer, botões na mesma linha |
| `src/pages/Dashboard.tsx` | Remover PageHeader, ajustar stats, remover QuickTimeTracker separado |

---

### Visualização Final

**Stats Row (5 colunas):**
```text
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│Clientes │Projetos │ Tarefas │Propostas│   [+]   │
│ 5 total │ 7 ativos│12 pend. │ 3 pend. │Customiz.│
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Coluna Direita (Ações Rápidas combinado):**
```text
┌────────────────────────────────────────┐
│ + Ações Rápidas                        │
├────────────────────────────────────────┤
│ [+ Novo Cliente] [+ Nova Proposta]     │
│                                        │
│           00:00:00                     │
│      [▶️ Iniciar Timer]                │
└────────────────────────────────────────┘
│                                        │
│ 📅 Calendário                          │
│ [Mini calendário]                      │
└────────────────────────────────────────┘
```

---

### Seção Técnica

**QuickActionsPanel atualizado:**
```typescript
export const QuickActionsPanel: React.FC = () => {
  // ... estados do cliente dialog
  const { 
    timerState, startGlobalTimer, pauseGlobalTimer, 
    resumeGlobalTimer, completeGlobalTimer, hasActiveTimer,
    showCompleteDialog, setShowCompleteDialog
  } = useGlobalTimer();
  const { data } = useData();
  
  // ... funções do timer
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botões na mesma linha */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setClientDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
            <Button variant="outline" onClick={() => navigate('/proposals')}>
              <FileCheck className="h-4 w-4 mr-2" />
              Nova Proposta
            </Button>
          </div>
          
          {/* Timer inline (sem título separado) */}
          <div className="flex flex-col items-center gap-3 pt-2 border-t">
            <div className={`text-3xl font-mono font-bold ${isRunning ? 'animate-pulse' : ''}`}>
              {formatTime(timerState.elapsedSeconds)}
            </div>
            {/* Info da tarefa + botões */}
          </div>
        </CardContent>
      </Card>
      
      {/* Dialogs */}
    </>
  );
};
```

**Dashboard.tsx - Stats atualizados:**
```typescript
// Filtros
const activeProjects = data.projects.filter(p => 
  p.status !== 'completed' && p.status !== 'cancelled'
);
const pendingTasks = data.tasks.filter(t => 
  t.status !== 'completed' && t.status !== 'done'
);

// Stats sem Horas
const stats = [
  { title: 'Clientes', value: data.clients.length, icon: Users, description: 'Total de clientes' },
  { title: 'Projetos', value: activeProjects.length, icon: FolderKanban, description: 'Projetos ativos' },
  { title: 'Tarefas', value: pendingTasks.length, icon: ListTodo, description: 'Tarefas pendentes' },
  { title: 'Propostas', value: proposalCount, icon: FileCheck, description: 'Pendentes ou enviadas' },
];

// No JSX - remover PageHeader e QuickTimeTracker separado
// Adicionar card customizável após os stats
```


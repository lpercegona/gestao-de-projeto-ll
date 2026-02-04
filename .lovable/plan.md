

## Plano Consolidado: Redesign do Painel com Header Atualizado

### Visão Geral

Este plano abrange a reformulação completa do layout do Dashboard (renomeado para "Painel"), incluindo alterações no header global, sidebar e novo layout em colunas 70/30, mantendo o timer fixo no header já implementado.

---

### Layout Desktop Final

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER FIXO                                                                          │
│ [Painel > Resumo]  [🔍 Em qual projeto trabalhará hoje?]  [Tarefa•Projeto] [⏱] 🔔   │
│  ↑ Breadcrumb       ↑ Pesquisa Universal                   ↑ Timer (MANTIDO)        │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR                    │ CONTEÚDO PRINCIPAL                                      │
│ ┌─────────────────────────┐│                                                         │
│ │ [🏢 Acme Inc]        ▼ ││ ┌─────────────────── 70% ──────────────────────────────┐│
│ │    Enterprise           ││ │ STATS (5 colunas)                                    ││
│ ├─────────────────────────┤│ │ [Clientes][Projetos][Tarefas][Propostas][Horas/Mês] ││
│ │ 🏠 Painel              ││ │                                                       ││
│ │ 👥 Clientes            ││ │ CONTEÚDO (2 colunas)                                  ││
│ │ 📁 Projetos            ││ │ ┌─────────────────┬─────────────────┐                 ││
│ │ 📋 Propostas           ││ │ │ Solicitações    │ Horas/Cliente   │                 ││
│ │ 📅 Calendário ← NOVO   ││ │ ├─────────────────┼─────────────────┤                 ││
│ │                        ││ │ │ Próx. Entregas  │ Últimos Registros│                ││
│ │                        ││ │ └─────────────────┴─────────────────┘                 ││
│ ├─────────────────────────┤│ └───────────────────────────────────────────────────────┘│
│ │ [Avatar] [Email]       ││                                                         │
│ │ ⚙️ Configurações       ││ ┌─────────── 30% ───────────────────┐                   │
│ │ 🚪 Sair                ││ │ [+ Novo Cliente][+ Nova Proposta] │                   │
│ └─────────────────────────┘│ │                                   │                   │
│                            │ │ 🕐 Registro Rápido               │                   │
│                            │ │ [Timer com selects]              │                   │
│                            │ │                                   │                   │
│                            │ │ 📅 Calendário                    │                   │
│                            │ │ [Mini calendário mensal]         │                   │
│                            │ └───────────────────────────────────┘                   │
└────────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

### Layout Mobile/Tablet (Prioridade nas Ações Rápidas)

```text
┌────────────────────────────────────┐
│ [☰] [Logo/Tarefa]     [⏱ Timer] 🔔│  ← Header (MANTIDO)
├────────────────────────────────────┤
│ [+ Novo Cliente] [+ Nova Proposta] │  ← PRIORIZADO
│ 🕐 Registro Rápido [Timer]         │  ← PRIORIZADO
│ 📅 Calendário                      │  ← PRIORIZADO
├────────────────────────────────────┤
│ [Stats: 2-3 colunas]               │
│ [Solicitações]                     │
│ [Horas por Cliente]                │
│ [Próximas Entregas]                │
│ [Últimos Registros]                │
└────────────────────────────────────┘
```

---

### Alterações no Header

#### Manter Timer Fixo (Sem Alteração)

Os componentes `HeaderTimerDisplay` e `HeaderTimerTaskInfo` permanecem inalterados, mantendo:
- Botão Play inicial
- Exibição do projeto/tarefa vinculada quando ativo
- Botões Pause/Resume e Stop
- Animação slide-in

#### Novo DesktopHeader

Adicionar breadcrumb e pesquisa universal, mantendo o timer no mesmo local:

```typescript
const DesktopHeader: React.FC<{ hideTimer?: boolean }> = ({ hideTimer = false }) => {
  const { hasActiveTimer } = useGlobalTimer();
  
  return (
    <div className="hidden lg:flex fixed top-0 left-0 right-0 z-30 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between w-full px-6">
        {/* Lado Esquerdo: Breadcrumb */}
        <BreadcrumbNav />
        
        {/* Centro: Barra de Pesquisa */}
        <UniversalSearchBar />
        
        {/* Lado Direito: Timer (MANTIDO) + Notificações */}
        <div className="flex items-center gap-3">
          {!hideTimer && (
            <div className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden",
              hasActiveTimer ? "max-w-[250px] opacity-100" : "max-w-0 opacity-0"
            )}>
              <HeaderTimerTaskInfo />
            </div>
          )}
          {!hideTimer && <HeaderTimerDisplay />}
          <NotificationBell />
        </div>
      </div>
    </div>
  );
};
```

---

### Alterações na Sidebar

#### Workspace Selector (Substituir Logo)

```typescript
// src/components/layout/WorkspaceSelector.tsx
const WorkspaceSelector: React.FC = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-medium">Acme Inc</p>
              <p className="text-xs text-muted-foreground">Enterprise</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Lista de workspaces */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

#### Novo Item de Navegação: Calendário

Adicionar na lista de navegação:
```typescript
{ path: '/calendar', icon: Calendar, label: 'Calendário' }
```

---

### Novo Layout do Dashboard (70/30)

```typescript
// src/pages/Dashboard.tsx
return (
  <div className="space-y-6">
    {/* Layout Principal: 70% / 30% */}
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      
      {/* COLUNA DIREITA - Aparece PRIMEIRO no mobile */}
      <div className="space-y-6 order-first lg:order-last">
        <QuickActionsPanel />      {/* Botões: Novo Cliente, Nova Proposta */}
        <QuickTimeTracker />       {/* Registro rápido de horas */}
        <DashboardCalendar />      {/* Mini calendário */}
      </div>
      
      {/* COLUNA ESQUERDA - Aparece DEPOIS no mobile */}
      <div className="space-y-6 order-last lg:order-first">
        {/* Stats Row - 5 colunas desktop, 2-3 mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Clientes" value={clientCount} icon={Users} />
          <StatCard title="Projetos" value={projectCount} icon={FolderKanban} />
          <StatCard title="Tarefas" value={taskCount} icon={ListTodo} />
          <StatCard title="Propostas" value={proposalCount} icon={FileText} />
          <StatCard title="Horas/Mês" value={monthlyHours} icon={Clock} />
        </div>
        
        {/* Content Area - 2 colunas desktop, 1 mobile */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SolicitacoesPanel />
            <ProximasEntregasPanel />
          </div>
          <div className="space-y-6">
            <HorasPorClientePanel />
            <UltimosRegistrosPanel />
          </div>
        </div>
      </div>
      
    </div>
  </div>
);
```

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/layout/WorkspaceSelector.tsx` | Dropdown de workspace no topo da sidebar |
| `src/components/layout/UniversalSearchBar.tsx` | Barra de pesquisa universal (Cmd+K) |
| `src/components/layout/BreadcrumbNav.tsx` | Navegação breadcrumb dinâmica |
| `src/components/dashboard/QuickActionsPanel.tsx` | Botões: Novo Cliente + Nova Proposta |
| `src/components/dashboard/SolicitacoesPanel.tsx` | Lista de solicitações pendentes |
| `src/components/dashboard/ProximasEntregasPanel.tsx` | Próximas entregas (extraído do existente) |
| `src/components/dashboard/HorasPorClientePanel.tsx` | Horas por cliente (extraído do existente) |
| `src/components/dashboard/UltimosRegistrosPanel.tsx` | Últimos registros (extraído do existente) |
| `src/components/dashboard/DashboardCalendar.tsx` | Mini calendário para o painel |
| `src/pages/CalendarPage.tsx` | Página de calendário expandido |
| `src/components/calendar/GanttView.tsx` | Visualização Gantt |

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/layout/AppLayout.tsx` | Workspace selector, header com breadcrumb/search, manter timer |
| `src/pages/Dashboard.tsx` | Novo layout 70/30 com ordem responsiva |
| `src/App.tsx` | Adicionar rota `/calendar` |

---

### Ordem de Implementação

**Fase 1: Header e Sidebar**
1. Criar `WorkspaceSelector.tsx`
2. Criar `BreadcrumbNav.tsx`
3. Criar `UniversalSearchBar.tsx`
4. Modificar `AppLayout.tsx` - novo header com breadcrumb/search, manter timer

**Fase 2: Dashboard**
1. Extrair painéis existentes para componentes separados
2. Criar `QuickActionsPanel.tsx`
3. Criar `DashboardCalendar.tsx`
4. Criar `SolicitacoesPanel.tsx`
5. Refatorar `Dashboard.tsx` com layout 70/30

**Fase 3: Calendário**
1. Criar `CalendarPage.tsx`
2. Criar `GanttView.tsx`
3. Adicionar rota em `App.tsx`

---

### Seção Tecnica

#### Classes CSS para Ordem Responsiva

```css
/* Coluna direita (ações) - primeiro no mobile */
.order-first { order: -1; }
.lg\:order-last { @media (min-width: 1024px) { order: 1; } }

/* Coluna esquerda (conteúdo) - depois no mobile */
.order-last { order: 1; }
.lg\:order-first { @media (min-width: 1024px) { order: -1; } }
```

#### UniversalSearchBar com Cmd+K

```typescript
const UniversalSearchBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data } = useData();
  const navigate = useNavigate();
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-80 justify-start">
        <Search className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-muted-foreground">Em qual projeto trabalhará hoje?</span>
        <kbd className="ml-auto pointer-events-none text-xs text-muted-foreground">⌘K</kbd>
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Pesquisar projetos, clientes, tarefas..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Projetos">
            {data.projects.slice(0, 5).map(project => (
              <CommandItem 
                key={project.id} 
                onSelect={() => { navigate(`/projects/${project.id}`); setOpen(false); }}
              >
                <FolderKanban className="h-4 w-4 mr-2" />
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Clientes">
            {data.clients.slice(0, 5).map(client => (
              <CommandItem 
                key={client.id} 
                onSelect={() => { navigate(`/clients/${client.id}`); setOpen(false); }}
              >
                <Users className="h-4 w-4 mr-2" />
                {client.company || client.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
```

#### DashboardCalendar com Link para Expandir

```typescript
const DashboardCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
            Expandir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          className="rounded-md"
        />
      </CardContent>
    </Card>
  );
};
```

---

### Componentes que Permanecem Inalterados

| Componente | Motivo |
|------------|--------|
| `HeaderTimerDisplay` | Timer no header já funciona conforme solicitado |
| `HeaderTimerTaskInfo` | Informações da tarefa já funcionam |
| `MobileHeader` | Animação logo/tarefa já implementada |
| `GlobalTimerContext` | Lógica de estado do timer |
| `QuickTimeTracker` | Será movido para coluna direita, sem alteração de código |


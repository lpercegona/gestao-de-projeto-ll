

## Plano: Remocao de PageHeader e Reorganizacao do Menu

### Objetivo

1. Remover a linha de titulo e descricao (PageHeader) de todas as paginas
2. Remover a opcao "Solicitacoes" do menu lateral
3. Mover a funcionalidade de Solicitacoes para dentro da pagina de Projetos (Projects.tsx)
4. Remover a opcao "Propostas" do menu lateral
5. Mover a funcionalidade de Propostas para dentro da pagina Clientes (Clients.tsx)
6. Remover a opcao "Edicoes" do menu lateral
7. Mover a funcionalidade de Edicoes para dentro da pagina de Projetos (Projects.tsx)

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Remover "Solicitacoes", "Propostas" e "Edicoes" do menu |
| `src/pages/Clients.tsx` | Remover PageHeader, adicionar tab "Propostas" |
| `src/pages/Projects.tsx` | Remover PageHeader, adicionar tabs "Solicitacoes" e "Edicoes" |
| `src/pages/ProjectRequests.tsx` | Remover PageHeader |
| `src/pages/Proposals.tsx` | Remover PageHeader |
| `src/pages/EditRequests.tsx` | Remover PageHeader |
| `src/pages/CalendarPage.tsx` | Remover PageHeader |
| `src/pages/Reports.tsx` | Remover PageHeader |

---

### 1. Remover do Menu (AppLayout.tsx)

**Linhas afetadas:** 173-192

**Alteracoes:**
- Remover `{ path: '/requests', icon: FileText, label: 'Solicitacoes' }` (linha 177)
- Remover `{ path: '/edit-requests', icon: Edit, label: 'Edicoes' }` (linha 178)
- Remover `{ path: '/proposals', icon: FileCheck, label: 'Propostas' }` (linha 179)
- Aplicar mesmas remocoes em adminNavItems (linhas 188-190)
- Remover imports nao utilizados: `FileText`, `FileCheck`, `Edit` (linhas 17, 21, 22)

**Menu final:**
```text
- Painel
- Clientes (com tab Propostas)
- Projetos (com tabs Solicitacoes e Edicoes)
- Calendario
```

---

### 2. Remover PageHeader de Todas as Paginas

| Pagina | Linhas | O que remover |
|--------|--------|---------------|
| `Clients.tsx` | 5, 177-180 | Import e componente PageHeader |
| `Projects.tsx` | 6, ~467-477 | Import e componente PageHeader |
| `ProjectRequests.tsx` | 5, 224-227 | Import e componente PageHeader |
| `Proposals.tsx` | 6, ~575-578 | Import e componente PageHeader |
| `EditRequests.tsx` | 2, 235-238 | Import e componente PageHeader |
| `CalendarPage.tsx` | 2, 111-114 | Import e componente PageHeader |
| `Reports.tsx` | 5, ~318-321 | Import e componente PageHeader |

---

### 3. Adicionar Tabs de Solicitacoes e Edicoes em Projects.tsx

**Nova estrutura com 3 tabs principais:**
```text
Filtros: [Cliente] [Status]

[Projetos] [Solicitacoes] [Edicoes]

<Conteudo da tab selecionada>
```

**Implementacao:**

1. Adicionar imports necessarios:
   - `Tabs, TabsContent, TabsList, TabsTrigger` de @/components/ui/tabs
   - Estados e funcoes do ProjectRequests.tsx e EditRequests.tsx

2. Adicionar novos states:
   ```typescript
   const [activeMainTab, setActiveMainTab] = useState<'projects' | 'requests' | 'edits'>('projects');
   const [requests, setRequests] = useState<ProjectRequest[]>([]);
   const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
   const [requestsLoading, setRequestsLoading] = useState(false);
   const [editsLoading, setEditsLoading] = useState(false);
   ```

3. Adicionar funcoes de fetch:
   ```typescript
   const fetchRequests = async () => { /* logica do ProjectRequests */ };
   const fetchEditRequests = async () => { /* logica do EditRequests */ };
   ```

4. Estrutura JSX:
   ```typescript
   <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
     <TabsList className="mb-4">
       <TabsTrigger value="projects">
         <FolderKanban className="w-4 h-4 mr-2" />
         Projetos
       </TabsTrigger>
       <TabsTrigger value="requests">
         <FileText className="w-4 h-4 mr-2" />
         Solicitacoes
         {pendingRequestsCount > 0 && <Badge>{pendingRequestsCount}</Badge>}
       </TabsTrigger>
       <TabsTrigger value="edits">
         <Edit className="w-4 h-4 mr-2" />
         Edicoes
         {pendingEditsCount > 0 && <Badge>{pendingEditsCount}</Badge>}
       </TabsTrigger>
     </TabsList>
     
     <TabsContent value="projects">
       {/* Conteudo existente de projetos */}
     </TabsContent>
     
     <TabsContent value="requests">
       {/* Conteudo de solicitacoes (adaptado de ProjectRequests.tsx) */}
     </TabsContent>
     
     <TabsContent value="edits">
       {/* Conteudo de edicoes (adaptado de EditRequests.tsx) */}
     </TabsContent>
   </Tabs>
   ```

---

### 4. Adicionar Tab de Propostas em Clients.tsx

**Nova estrutura:**
```text
[Clientes] [Propostas]

<Conteudo da tab selecionada>
```

**Implementacao:**

1. Adicionar imports de Proposals.tsx:
   - Estados: `proposals`, `templates`, `loading`, `searchTerm`, `statusFilter`
   - Dialogs: `proposalDialogOpen`, `templateDialogOpen`, etc.
   - Funcoes: `fetchData`, `handleSaveProposal`, etc.

2. Adicionar novo state:
   ```typescript
   const [mainTab, setMainTab] = useState<'clients' | 'proposals'>('clients');
   ```

3. Estrutura JSX:
   ```typescript
   <Tabs value={mainTab} onValueChange={setMainTab}>
     <div className="flex items-center justify-between mb-4">
       <TabsList>
         <TabsTrigger value="clients">
           <Users className="w-4 h-4 mr-2" />
           Clientes
         </TabsTrigger>
         <TabsTrigger value="proposals">
           <FileCheck className="w-4 h-4 mr-2" />
           Propostas
         </TabsTrigger>
       </TabsList>
       {/* Botao dinamico baseado na tab */}
     </div>
     
     <TabsContent value="clients">
       {/* Conteudo existente de clientes */}
     </TabsContent>
     
     <TabsContent value="proposals">
       {/* Conteudo de propostas (adaptado de Proposals.tsx) */}
     </TabsContent>
   </Tabs>
   ```

---

### 5. Manter Rotas Funcionais

As rotas existentes serao mantidas para compatibilidade e acesso direto:
- `/requests` - continua funcionando (ProjectRequests.tsx)
- `/proposals` - continua funcionando (Proposals.tsx)
- `/edit-requests` - continua funcionando (EditRequests.tsx)

Apenas removidas do menu de navegacao.

---

### Estrutura Final

**Menu de Navegacao (Admin):**
```text
├── Painel
├── Clientes (com tab Propostas)
├── Projetos (com tabs Solicitacoes + Edicoes)
└── Calendario
```

**Pagina de Clientes:**
```text
[Clientes] [Propostas]

→ Tab Clientes:
   [Lead] [Negociacao] [Ativo] [Inativo]  [+ Novo Cliente]
   <Grid de cards de clientes>

→ Tab Propostas:
   [Busca] [Filtro Status] [+ Nova Proposta]
   [Propostas] [Templates]
   <Lista de propostas/templates>
```

**Pagina de Projetos:**
```text
[Projetos] [Solicitacoes (3)] [Edicoes (2)]

→ Tab Projetos:
   Filtros: [Cliente]    Visualizacao: [Lista] [Kanban]
   X projetos [+ Novo Projeto]
   <Lista/Kanban de projetos>

→ Tab Solicitacoes:
   [Filtro Status] [Filtro Cliente]
   [Cards de resumo]
   <Lista de solicitacoes>

→ Tab Edicoes:
   <Lista de solicitacoes de edicao pendentes>
   <Lista de solicitacoes processadas>
```

---

### Secao Tecnica

**AppLayout.tsx - Novo array de navegacao:**
```typescript
const masterAdminNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Painel' },
  { path: '/clients', icon: Users, label: 'Clientes' },
  { path: '/projects', icon: FolderKanban, label: 'Projetos' },
  { path: '/calendar', icon: Calendar, label: 'Calendario' },
];

const adminNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Painel' },
  { path: '/clients', icon: Users, label: 'Clientes' },
  { path: '/projects', icon: FolderKanban, label: 'Projetos' },
  { path: '/calendar', icon: Calendar, label: 'Calendario' },
];
```

**Projects.tsx - Interfaces adicionais:**
```typescript
interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  converted_project_id: string | null;
  desired_deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface EditRequest {
  id: string;
  entity_type: 'project' | 'project_request';
  entity_id: string;
  client_id: string;
  status: 'pending' | 'approved' | 'rejected';
  original_data: Record<string, unknown>;
  proposed_data: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
  client?: { name: string; company: string | null; };
}
```

**Clients.tsx - Interfaces adicionais:**
```typescript
interface ProposalItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
}

interface Proposal {
  id: string;
  template_id: string | null;
  share_token: string;
  recipient_name: string;
  recipient_email: string;
  recipient_company: string | null;
  title: string;
  description: string | null;
  items: ProposalItem[];
  total_hours: number;
  total_value: number;
  status: string;
  valid_until: string | null;
  created_at: string;
  client_id: string | null;
}

interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  items: ProposalItem[];
}
```

---

### Ordem de Implementacao

1. Remover PageHeader de todas as paginas (7 arquivos)
2. Remover itens do menu em AppLayout.tsx
3. Adicionar tabs de Solicitacoes e Edicoes em Projects.tsx
4. Adicionar tab de Propostas em Clients.tsx
5. Testar navegacao e funcionalidades


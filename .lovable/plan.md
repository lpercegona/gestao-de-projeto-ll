

## Plano: Correção de Prazos em Projetos Convertidos e Ordenação de Próximas Entregas

Este plano corrige três problemas identificados no sistema de gestão de prazos.

---

### Problema 1: Prazo Desejado Não Transferido ao Converter Solicitação

**Local:** `src/pages/ProjectRequests.tsx` (função `handleConvertToProject`)

**Situação Atual:**
Ao converter uma solicitação em projeto, o campo `desired_deadline` da solicitação não é transferido para o campo `due_date` do novo projeto.

```typescript
// Código atual (linha 131-137)
const newProject = await createProject({
  client_id: convertRequest.client_id,
  name: projectName.trim(),
  description: projectDescription.trim() || convertRequest.briefing,
  status: 'active',
  custom_fields: {},
  // due_date NÃO está sendo incluído
});
```

**Correção:**
Incluir o `due_date` no objeto de criação do projeto, usando o `desired_deadline` da solicitação.

```typescript
const newProject = await createProject({
  client_id: convertRequest.client_id,
  name: projectName.trim(),
  description: projectDescription.trim() || convertRequest.briefing,
  status: 'active',
  custom_fields: {},
  due_date: convertRequest.desired_deadline || null, // NOVO
});
```

---

### Problema 2: Tarefas/Projetos Concluídos Exibem Prazo

**Locais:**
- `src/components/projects/TaskCard.tsx` (tarefas individuais)
- `src/components/projects/ProjectListView.tsx` (se aplicável)

**Situação Atual:**
O campo de prazo é exibido mesmo quando a tarefa está concluída ("completed" ou "done"), o que não faz sentido operacional.

**Correção no `TaskCard.tsx`:**
Adicionar condição para ocultar o prazo quando a tarefa estiver concluída.

```typescript
// Antes (linha 196-217)
{task.due_date && (
  <Tooltip>...</Tooltip>
)}

// Depois
{task.due_date && task.status !== 'completed' && task.status !== 'done' && (
  <Tooltip>...</Tooltip>
)}
```

---

### Problema 3: Ordenação de "Próximas Entregas" no Dashboard

**Locais:**
- `src/pages/Dashboard.tsx`
- `src/pages/CollaboratorDashboard.tsx`

**Situação Atual:**
A seção "Próximas Entregas" exibe apenas itens com prazo definido e ordena por data do prazo. Itens sem prazo não aparecem.

**Novo Comportamento Solicitado:**
1. Incluir projetos/tarefas SEM prazo definido
2. Priorizar itens COM prazo (ordenados por proximidade do prazo)
3. Itens sem prazo aparecem após, ordenados por data de criação
4. Manter filtro de status (não exibir concluídos)

**Alterações no `Dashboard.tsx` e `CollaboratorDashboard.tsx`:**

```typescript
const upcomingDeadlines = useMemo((): DeadlineItem[] => {
  const itemsWithDeadline: DeadlineItem[] = [];
  const itemsWithoutDeadline: DeadlineItem[] = [];
  
  // Projetos ativos (não concluídos)
  data.projects
    .filter(p => p.status !== 'completed')
    .forEach(p => {
      const client = data.clients.find(c => c.id === p.client_id);
      
      if (p.due_date) {
        const status = getDeadlineStatus(p.due_date);
        if (status) {
          itemsWithDeadline.push({
            id: p.id,
            type: 'project',
            name: p.name,
            due_date: p.due_date,
            clientName: client?.company || client?.name,
            status,
            created_at: p.created_at
          });
        }
      } else {
        // Projeto sem prazo - usar status 'normal'
        itemsWithoutDeadline.push({
          id: p.id,
          type: 'project',
          name: p.name,
          due_date: '', // Sem prazo
          clientName: client?.company || client?.name,
          status: 'normal',
          created_at: p.created_at
        });
      }
    });
  
  // Tarefas não concluídas
  data.tasks
    .filter(t => t.status !== 'completed' && t.status !== 'done')
    .forEach(t => {
      const project = data.projects.find(p => p.id === t.project_id);
      const client = project ? data.clients.find(c => c.id === project.client_id) : null;
      
      if (t.due_date) {
        const status = getDeadlineStatus(t.due_date);
        if (status) {
          itemsWithDeadline.push({
            id: t.id,
            type: 'task',
            name: t.name,
            due_date: t.due_date,
            projectId: t.project_id,
            projectName: project?.name,
            clientName: client?.company || client?.name,
            status,
            created_at: t.created_at
          });
        }
      } else {
        itemsWithoutDeadline.push({
          id: t.id,
          type: 'task',
          name: t.name,
          due_date: '',
          projectId: t.project_id,
          projectName: project?.name,
          clientName: client?.company || client?.name,
          status: 'normal',
          created_at: t.created_at
        });
      }
    });
  
  // Ordenar com prazo por proximidade
  itemsWithDeadline.sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
  
  // Ordenar sem prazo por criação (mais recentes primeiro)
  itemsWithoutDeadline.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Combinar: primeiro com prazo, depois sem prazo
  return [...itemsWithDeadline, ...itemsWithoutDeadline].slice(0, 10);
}, [data.projects, data.tasks, data.clients, loading]);
```

**Alteração na Interface `DeadlineItem`:**

Arquivo: `src/components/dashboard/UpcomingDeadlines.tsx`

```typescript
export interface DeadlineItem {
  id: string;
  type: 'task' | 'project';
  name: string;
  due_date: string; // Pode ser string vazia para itens sem prazo
  projectId?: string;
  projectName?: string;
  clientName?: string;
  status: DeadlineStatus;
  created_at?: string; // NOVO - para ordenação
}
```

**Alteração na Exibição:**

Arquivo: `src/components/dashboard/UpcomingDeadlines.tsx`

Ajustar para exibir "Sem prazo" quando `due_date` for vazio:

```typescript
{item.due_date ? (
  <div className={cn(
    "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
    getDeadlineClasses(item.status)
  )}>
    <Calendar className="h-3 w-3" />
    <span>{format(parseISO(item.due_date), "dd/MM", { locale: ptBR })}</span>
  </div>
) : (
  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-muted-foreground bg-muted">
    <span>Sem prazo</span>
  </div>
)}
```

---

### Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ProjectRequests.tsx` | Incluir `due_date` ao criar projeto a partir de solicitação |
| `src/components/projects/TaskCard.tsx` | Ocultar prazo em tarefas concluídas |
| `src/components/dashboard/UpcomingDeadlines.tsx` | Atualizar interface e exibição para itens sem prazo |
| `src/pages/Dashboard.tsx` | Nova lógica de ordenação priorizando itens com prazo |
| `src/pages/CollaboratorDashboard.tsx` | Mesma lógica de ordenação |

---

### Resultado Esperado

1. **Conversão de Solicitações**: O prazo desejado pelo cliente será automaticamente transferido para o campo de prazo do novo projeto

2. **Tarefas Concluídas**: O campo de prazo não será mais exibido em tarefas com status "completed" ou "done"

3. **Próximas Entregas**: 
   - Exibirá todas as tarefas/projetos pendentes
   - Itens com prazo aparecem primeiro (ordenados por proximidade)
   - Itens sem prazo aparecem depois (ordenados por data de criação)
   - Limite de 10 itens mantido


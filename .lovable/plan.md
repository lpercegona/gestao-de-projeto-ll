

## Plano: Unificar mapeamento de etapas entre Tabela e Kanban

### Problema
A visualização de tabela e o kanban usam mapeamentos de status diferentes e inconsistentes:

1. **Tabela (`ProjectTableView`)**: `getNextTaskStatus` retorna o **nome da etapa** (ex: "Em Andamento") e grava isso no banco — mas o banco espera valores como "pending", "in_progress", "completed"
2. **Kanban (`ProjectKanbanView`)**: `getStageKeyFromStatus` e `getStatusFromStageKey` são hardcoded com apenas 3 status fixos, ignorando etapas customizadas do kanban

Resultado: ao alterar status na tabela, o valor salvo é um nome de etapa em português, que o kanban não reconhece e joga na primeira coluna.

### Solução

Criar um mapeamento bidirecional consistente entre **nomes de etapas do kanban** e **valores de status do banco**, usado por ambos os componentes.

#### 1. `src/components/projects/ProjectTableView.tsx`
- Alterar `getNextTaskStatus` para retornar o **valor de status do banco** correspondente à próxima etapa, não o nome
- Criar um mapa `stageNameToDbStatus` que mapeia nomes de etapa para valores do banco:
  - Etapas padrão: "Pendente"→"pending", "Em Andamento"→"in_progress", "Concluída"→"completed"
  - Etapas customizadas: usar o `id` da etapa como valor de status

#### 2. `src/components/projects/ProjectKanbanView.tsx`
- Substituir `getStageKeyFromStatus` e `getStatusFromStageKey` hardcoded por funções que usam o array `kanbanStages` dinâmicamente
- Quando o status no banco é um ID de etapa customizada, mapear para o nome correto da etapa
- Quando o status é um valor legacy (pending/in_progress/completed), continuar mapeando para os nomes padrão

### Detalhes técnicos

```text
Fluxo atual (quebrado):
  Tabela click → getNextTaskStatus → "Em Andamento" → salva no DB
  Kanban lê DB → getStageKeyFromStatus("Em Andamento") → default "Pendente" ❌

Fluxo corrigido:
  Tabela click → getNextTaskStatus → "in_progress" → salva no DB  
  Kanban lê DB → getStageKeyFromStatus("in_progress") → "Em Andamento" ✓

  Para etapas customizadas:
  Tabela click → getNextTaskStatus → stage.id → salva no DB
  Kanban lê DB → encontra stage por id → coluna correta ✓
```

### Arquivos alterados
1. `src/components/projects/ProjectTableView.tsx` — `getNextTaskStatus` retorna DB status em vez de nome
2. `src/components/projects/ProjectKanbanView.tsx` — `getStageKeyFromStatus`/`getStatusFromStageKey` usam `kanbanStages` dinamicamente


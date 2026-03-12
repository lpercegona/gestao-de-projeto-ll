

## Plano: Adicionar scroll às caixas de diálogo sem tratamento de overflow

### Mapeamento completo

| Diálogo | Arquivo | Scroll interno? |
|---------|---------|-----------------|
| Novo/Editar Projeto | Projects.tsx:1560 | ✅ Já tem |
| Solicitação de Projeto | Projects.tsx:1377 | ✅ Já tem |
| Solicit. de Edição | Projects.tsx:1456 | ✅ Já tem |
| Nova/Editar Tarefa | Projects.tsx:1648 | ✅ Já tem |
| **Registrar Horas** | Projects.tsx:1666 | ❌ Falta |
| **Concluir Registro** | Projects.tsx:1701 | ❌ Falta |
| **Campo Personalizado** | Projects.tsx:1732 | ❌ Falta |
| Nova/Editar Tarefa | ProjectDetail.tsx:462 | ✅ Já tem |
| Registrar Horas | ProjectDetail.tsx:496 | ✅ Já tem |
| **Concluir Registro** | ProjectDetail.tsx:584 | ❌ Falta |
| Etapas Kanban | KanbanStagesDialog | ✅ Já tem |
| Compartilhar | ProjectShareDialog | ✅ Já tem |
| Detalhe Tabela | ProjectTableView | ✅ Já tem |

### Correções (4 diálogos)

1. **Projects.tsx — Time Entry Dialog (linha 1666)**: Adicionar `max-h-[60vh] overflow-y-auto pr-1` ao div `space-y-4 py-4`

2. **Projects.tsx — Complete Timer Dialog (linha 1701)**: Adicionar `max-h-[60vh] overflow-y-auto pr-1` ao div `space-y-4 py-4`

3. **Projects.tsx — Column Dialog (linha 1732)**: Adicionar `max-h-[60vh] overflow-y-auto pr-1` ao div `space-y-4 py-4`

4. **ProjectDetail.tsx — Pause/Complete Timer Dialog (linha 584)**: Adicionar `max-h-[50vh] overflow-y-auto pr-1` ao div `space-y-4 py-4`

### Arquivos alterados
- `src/pages/Projects.tsx` (3 divs)
- `src/pages/ProjectDetail.tsx` (1 div)


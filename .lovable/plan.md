# Plano: Atualização Visual da Página de Projetos

## Status: ✅ Concluído

## Alterações Realizadas

### 1. Remoção das Tabs (Projetos/Solicitações/Edições)
- Removidas as tabs que separavam projetos, solicitações e edições
- A página agora exibe apenas a lista/kanban de projetos

### 2. Nova Barra de Filtros Unificada
Layout: `[Contador] [Filtro] [Lista|Kanban] [+]`

Componentes:
- **Contador**: "X projetos" 
- **Botão Filtro**: Dropdown com filtros por:
  - Cliente
  - Etapa (status do kanban)
  - Período (data de entrega)
- **Toggle de Visualização**: Lista / Kanban
- **Botão Adicionar**: Apenas para admins

### 3. Arquivos Removidos
- `src/pages/ProjectRequests.tsx`
- `src/pages/EditRequests.tsx`
- `src/components/projects/ProjectRequestsTab.tsx`
- `src/components/projects/EditRequestsTab.tsx`

### 4. Rotas Removidas (App.tsx)
- `/requests` - Solicitações de projetos
- `/edit-requests` - Edições pendentes
- `/proposals` - Propostas
- `/contracts` - Contratos

### 5. Arquivos Modificados
- `src/components/projects/ProjectFilters.tsx` - Novo componente de filtros unificado
- `src/pages/Projects.tsx` - Refatorado para usar novo layout
- `src/App.tsx` - Rotas removidas

## Próximos Passos (Pendentes)
- As solicitações de novos projetos serão tratadas diretamente no painel de projetos
- As solicitações de edições serão tratadas diretamente no projeto em questão

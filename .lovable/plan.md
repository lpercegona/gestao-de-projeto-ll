
# Plano: Ajustes de Navegação Mobile

## Resumo das Alterações

Duas modificações na interface mobile para melhorar a experiência de navegação:

1. **Header Mobile**: Substituir a logo ORAS pela barra de pesquisa universal
2. **Menu Mobile (Sidebar)**: Substituir a logo pelo seletor de workspace

---

## Alterações Visuais

### Antes vs Depois

**Header Mobile:**
- Antes: `[≡] [Logo ORAS] ................ [Timer] [🔔]`
- Depois: `[≡] [🔍 Pesquisar...] ........... [Timer] [🔔]`

**Menu Mobile (topo da sidebar):**
- Antes: Logo ORAS centralizada
- Depois: WorkspaceSelector com avatar, nome do workspace e plano

---

## Detalhes Técnicos

### 1. MobileHeader - Adicionar Barra de Pesquisa

Arquivo: `src/components/layout/AppLayout.tsx`

Modificações no componente `MobileHeader`:
- Remover o container animado que alterna entre logo e info do timer
- Adicionar o componente `UniversalSearchBar` ocupando o espaço central
- Manter a animação do timer info apenas ao lado direito quando ativo

O comportamento do timer será preservado, mas o info da tarefa aparecerá de forma diferente (não mais animando com a logo).

### 2. Sidebar Mobile - Substituir Logo por WorkspaceSelector

Arquivo: `src/components/layout/AppLayout.tsx`

Modificações na seção do header da sidebar:
- Remover a tag `<img>` que exibe a logo no mobile
- Adicionar `<WorkspaceSelector isCollapsed={false} />` visível apenas no mobile (`lg:hidden`)
- O WorkspaceSelector já existe e mostra avatar + nome do workspace + plano

---

## Comportamentos Preservados

- Timer display e notification bell continuam no header mobile
- Animação do timer info no desktop permanece inalterada
- Atalho de teclado ⌘K continua funcionando para abrir a pesquisa
- WorkspaceSelector no desktop continua funcionando normalmente
- Botão de fechar menu (X) no mobile continua no mesmo lugar

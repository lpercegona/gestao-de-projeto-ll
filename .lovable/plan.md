

# Plano: Correções de Descrição e Layout Mobile dos Projetos

## 1. Correção das Tags `<p>` Visíveis nas Descrições

**Arquivo:** `src/components/ui/wysiwyg-editor.tsx`

**Problema:** Descrições em texto puro (sem formatação HTML) estão sendo exibidas literalmente com as tags `<p>` visíveis.

**Solução:** Modificar o componente `WysiwygContent` para:
- Adicionar `useMemo` ao import do React
- Verificar se o conteúdo já contém tags HTML
- Se for texto puro, envolvê-lo automaticamente em uma tag `<p>` para renderização consistente

**Alterações:**
- Linha 1: Adicionar `useMemo` ao import
- Linhas 222-251: Reestruturar o componente `WysiwygContent` com processamento de conteúdo

---

## 2. Layout Mobile dos Filtros de Projetos

**Arquivo:** `src/components/projects/ProjectFilters.tsx`

**Layout atual (todas as telas):**
```
[8 projetos] [Filtro] [Lista|Kanban] .............. [+]
```

**Layout mobile desejado:**
```
Linha 1: [Filtro] ---- [Lista|Kanban] ---- [+]
Linha 2: [8 projetos]
```

**Layout desktop (sem alteração):**
```
[8 projetos] [Filtro] [Lista|Kanban] .............. [+]
```

**Alterações:**
- Reestruturar o container principal com `flex-col sm:flex-row`
- Mover a contagem de projetos para uma segunda linha no mobile (`sm:hidden` / `hidden sm:block`)
- Duplicar o botão de adicionar para posicionamento diferente no mobile e desktop

---

## Arquivos Afetados

1. `src/components/ui/wysiwyg-editor.tsx`
2. `src/components/projects/ProjectFilters.tsx`


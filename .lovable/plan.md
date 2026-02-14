
# Plano: Corrigir tokens CSS, alto contraste e cores hardcoded

## Resumo do Problema

Existem dois problemas interconectados:

1. **Alto contraste nao funciona corretamente** - A classe `.high-contrast` define tokens CSS, mas a maioria dos componentes usa cores fixas em hex (`#0f172a`, `#64748b`, `#e2e8f0`, etc.) e `bg-white` que ignoram completamente os tokens CSS do design system. Isso faz com que o modo alto contraste nao tenha efeito visual nessas areas.

2. **Cores nao respondem a personalizacao do admin** - O `ThemeContext` so aplica `--primary`, `--secondary` e `--accent`. Porem, o sidebar, header, search bar, timer modal e outros componentes usam cores hex fixas que nunca mudam, independente da escolha do admin.

## Mapeamento Completo de Cores Hardcoded

### Arquivo 1: `src/components/layout/AppLayout.tsx` (CRITICO - 30+ ocorrencias)

Cores fixas encontradas:
- `text-[#64748b]` - deveria ser `text-muted-foreground`
- `text-[#0f172a]` - deveria ser `text-foreground`
- `text-[#334155]` - deveria ser `text-foreground`
- `text-[#94a3b8]` - deveria ser `text-muted-foreground`
- `bg-white` - deveria ser `bg-background` ou `bg-card`
- `bg-white/70` - deveria ser `bg-muted`
- `border-[#e2e8f0]` - deveria ser `border-border`
- Conteudo principal (linha 598): `bg-white` fixo

### Arquivo 2: `src/components/layout/UniversalSearchBar.tsx` (8 ocorrencias)

- `border-[#e2e8f0]` -> `border-border`
- `bg-white` -> `bg-background`
- `text-[#64748b]` -> `text-muted-foreground`

### Arquivo 3: `src/components/timer/ExpandedTimerModal.tsx` (25+ ocorrencias)

- `bg-[#F4F7FB]` -> `bg-muted`
- `text-[#64748b]` -> `text-muted-foreground`
- `text-[#0f172a]` -> `text-foreground`
- `border-[#e2e8f0]` -> `border-border`
- `border-[#64748b]` -> `border-muted-foreground`
- `bg-white` -> `bg-background`
- `bg-[#e2e8f0]` -> `bg-muted`
- `bg-[#d6dee8]` -> `border-border`
- `bg-[#dce4ee]` -> `bg-border`
- `text-gray-300` (modo high contrast) -> `text-muted-foreground` (os tokens ja cuidam disso)
- `text-[#475569]` -> `text-foreground`
- `hover:bg-gray-200` -> `hover:bg-muted`
- `bg-black` -> ja definido pelo token `--background` no modo alto contraste

### Arquivo 4: `src/components/ui/button.tsx` (variante `edit`)

- `text-slate-500` -> `text-muted-foreground`
- `bg-slate-100` -> `bg-muted`
- `hover:bg-slate-200` -> `hover:bg-muted/80`
- `hover:text-slate-500` -> `hover:text-muted-foreground`

### Arquivo 5: `src/components/ui/tabs.tsx` (linha 34)

- `border-slate-200` -> `border-border`

### Arquivo 6: `src/components/ui/toggle.tsx` (linha 14)

- `border-slate-200` -> `border-border`

### Arquivo 7: `src/lib/design-tokens.ts` (timer paused)

- `bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400` - cores semanticas de status, aceitavel manter

### Arquivo 8: Badges de status (varios arquivos)

Cores como `bg-green-100 text-green-800`, `bg-blue-500/20 text-blue-700`, etc. em:
- `Proposals.tsx`, `PublicProposal.tsx`, `ClientDetail.tsx`, `ProjectDetail.tsx`, `SolicitacoesPanel.tsx`, `ProposalsTab.tsx`

Estas sao **cores semanticas de status** (verde=aprovado, vermelho=rejeitado, etc.) e devem ser mantidas como estao - nao faz sentido que mudem com a cor primaria.

## Inconsistencias no Alto Contraste

### Token `.high-contrast` no CSS (index.css)

A classe `.high-contrast` define tokens adequados:
- `--background: 0 0% 0%` (preto)
- `--foreground: 0 0% 100%` (branco)
- `--primary: 60 100% 50%` (amarelo)
- `--border: 0 0% 100%` (branco)

Porem, como os componentes usam hex fixo (`bg-white`, `text-[#64748b]`), os tokens sao ignorados. Ao trocar para classes semanticas (`bg-background`, `text-muted-foreground`), o alto contraste passara a funcionar automaticamente.

### Timer Modal tem sistema de alto contraste proprio

O `ExpandedTimerModal` tem um toggle interno `highContrast` com condicionais manuais (`highContrast ? 'text-white' : 'text-[#0f172a]'`). Ao migrar para tokens CSS, essas condicionais se tornam desnecessarias - o estado global `high-contrast` aplicado via `AppLayout` ja cuida disso.

## Plano de Correcao

### Passo 1 - Complementar tokens de alto contraste no CSS

Adicionar tokens faltantes na classe `.high-contrast` em `index.css`:
- `--destructive`
- `--ring`
- `--sidebar-*` (todos os tokens de sidebar)

Para que sidebar e elementos adicionais tambem respondam ao alto contraste.

### Passo 2 - Migrar AppLayout.tsx para tokens semanticos

Substituir todas as ~30 ocorrencias de cores hex por classes Tailwind semanticas:
- `text-[#64748b]` -> `text-muted-foreground`
- `text-[#0f172a]` -> `text-foreground`
- `bg-white` -> `bg-card` (sidebar items) / `bg-background` (conteudo)
- `border-[#e2e8f0]` -> `border-border`
- `hover:bg-white/70` -> `hover:bg-muted`
- `hover:text-[#334155]` -> `hover:text-foreground`
- `text-[#94a3b8]` -> `text-muted-foreground`

### Passo 3 - Migrar UniversalSearchBar.tsx

Substituir todas as cores hex pela versao semantica correspondente.

### Passo 4 - Migrar ExpandedTimerModal.tsx

- Substituir todas as cores hex por tokens semanticos
- Remover o toggle `highContrast` interno e suas condicionais - o modo alto contraste global ja cuidara de tudo via tokens CSS
- Manter o botao de alto contraste no modal mas faze-lo ativar/desativar a classe `high-contrast` global

### Passo 5 - Corrigir componentes UI base

- `button.tsx`: variante `edit` - trocar `text-slate-*` e `bg-slate-*` por tokens
- `tabs.tsx`: trocar `border-slate-200` por `border-border`
- `toggle.tsx`: trocar `border-slate-200` por `border-border`

### Passo 6 - Expandir ThemeContext para derivar mais tokens

Atualmente o `applyTheme` so define `--primary`, `--secondary` e `--accent`. Para que a cor primaria do admin realmente influencie botoes, icones e fontes, expandir para tambem derivar:
- `--primary-foreground` (calculado automaticamente: branco para cores escuras, preto para claras)
- `--ring` (baseado na primary)
- `--sidebar-primary` e `--sidebar-primary-foreground`

Isso garante que ao mudar a cor primaria, botoes, links e icones ativos respondam automaticamente.

## Secao Tecnica

```text
Arquivos a modificar:
  1. src/index.css - Completar tokens .high-contrast (sidebar-*, destructive, ring)
  2. src/components/layout/AppLayout.tsx - ~30 substituicoes de hex -> tokens
  3. src/components/layout/UniversalSearchBar.tsx - ~8 substituicoes
  4. src/components/timer/ExpandedTimerModal.tsx - ~25 substituicoes + remover highContrast local
  5. src/components/ui/button.tsx - variante edit (4 substituicoes)
  6. src/components/ui/tabs.tsx - 1 substituicao (border-slate-200)
  7. src/components/ui/toggle.tsx - 1 substituicao (border-slate-200)
  8. src/contexts/ThemeContext.tsx - Expandir applyTheme para derivar primary-foreground, ring, sidebar-primary

Nao serao alterados (cores semanticas de status - aceitavel):
  - Badges de status em Proposals, ProjectDetail, SolicitacoesPanel, etc.
  - Cores amber/green/red para alertas e indicadores
```

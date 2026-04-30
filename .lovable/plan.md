# Ajuste de proporção dos botões de Ações Rápidas

## Objetivo
Tornar os botões do painel "Ações Rápidas" **quadrados** (altura igual à largura) para todos os perfis — admin (3 botões) e não-admin/cliente (2 botões).

## Mudança

**Arquivo:** `src/components/dashboard/QuickActionsPanel.tsx`

Em cada um dos 3 `Button` (Cliente, Projeto, Proposta), substituir as classes de altura/padding por `aspect-square`:

- Remover: `h-auto py-3`
- Adicionar: `aspect-square`
- Manter: `flex-col gap-1`, ícone `h-5 w-5`, texto `text-[11px] leading-tight`

Como o grid (`grid-cols-3` para admin, `grid-cols-2` para não-admin) define a largura de cada célula, `aspect-square` força a altura idêntica automaticamente, em qualquer viewport.

## Resultado visual

```text
Admin (3 colunas):           Não-admin/Cliente (2 colunas):
┌──────┬──────┬──────┐       ┌─────────┬─────────┐
│  👥  │  📁  │  ✓  │       │   👥    │   ✓    │
│Client│Projet│Propos│       │ Cliente │Proposta │
└──────┴──────┴──────┘       └─────────┴─────────┘
   (quadrados)                    (quadrados)
```

Sem alterações no timer, FormSheet ou em outros componentes.

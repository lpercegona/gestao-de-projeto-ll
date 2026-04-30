# Ajuste visual dos botões de Ações Rápidas

## Objetivo
Para admins, exibir os 3 botões (Cliente, Projeto, Proposta) **lado a lado em uma única linha**, com ícone maior no topo e rótulo de texto menor abaixo. Para usuários não-admin (apenas 2 botões), aplicar o mesmo padrão visual.

## Mudanças

**Arquivo:** `src/components/dashboard/QuickActionsPanel.tsx`

1. Trocar o grid `grid-cols-2` por `grid-cols-3` (admins) / `grid-cols-2` (não-admins) usando classe dinâmica baseada em `isAdminOrMaster`.
2. Reestilizar cada `Button`:
   - Layout vertical: `flex-col` com `gap-1`
   - Altura automática com padding vertical (`h-auto py-3`)
   - Remover `justify-start` (centralizar conteúdo)
   - Ícone maior: `h-5 w-5` (era `h-4 w-4`)
   - Texto envolvido em `<span className="text-[11px] leading-tight">` para ficar menor que o tamanho padrão do botão.

## Resultado visual

```text
┌────────┬────────┬────────┐
│   👥   │   📁   │   ✓    │
│Cliente │Projeto │Proposta│
└────────┴────────┴────────┘
```

Sem alterações no timer ou no FormSheet.

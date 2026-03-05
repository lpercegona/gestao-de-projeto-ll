

# Prevenir diálogos de fechar ao trocar de aba

## Problema

Quando o usuário troca de aba do navegador, o Radix UI interpreta a perda de foco como uma interação externa e fecha o diálogo automaticamente. Isso acontece porque o `DialogContent` não tem handlers para `onInteractOutside` e `onPointerDownOutside`.

## Solução

Modificar o componente `DialogContent` em `src/components/ui/dialog.tsx` para interceptar eventos de interação externa e prevenir o fechamento automático. Isso é feito adicionando dois handlers:

- `onPointerDownOutside`: previne clique fora de fechar o diálogo
- `onInteractOutside`: previne qualquer interação externa (incluindo perda de foco por troca de aba)

```typescript
// Em DialogContent, extrair os handlers do props para compor com os defaults:
onPointerDownOutside={(e) => {
  e.preventDefault();
  props.onPointerDownOutside?.(e); // preservar handler customizado se existir
}}
onInteractOutside={(e) => {
  e.preventDefault();
  props.onInteractOutside?.(e);
}}
```

O usuário ainda poderá fechar o diálogo pelo botão X ou pelo ESC (comportamento padrão mantido).

## Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/components/ui/dialog.tsx` | Adicionar `onPointerDownOutside` e `onInteractOutside` com `preventDefault()` no `DialogContent` |

Esta é uma correção centralizada -- todos os diálogos da aplicação herdam automaticamente este comportamento.


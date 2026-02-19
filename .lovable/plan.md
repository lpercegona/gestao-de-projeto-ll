# Correcao: Espacamento entre paragrafos no template compartilhavel + erro de build em Services.tsx

## Problema 1: Espacamento de paragrafos nao aparece na proposta compartilhavel

O editor TipTap gera tags `<p></p>` vazias quando o usuario pressiona Enter para criar espacamento entre paragrafos. No editor, esses paragrafos vazios sao renderizados com altura visivel (TipTap adiciona `<br>` ou min-height internamente). Porem, no componente `WysiwygContent`, essas tags `<p></p>` vazias colapsam para altura zero no HTML puro.

Alem disso, a classe `prose-p:my-1` (margin de apenas 4px) comprime ainda mais o espacamento visual entre paragrafos.

### Solucao

No componente `WysiwygContent` (`src/components/ui/wysiwyg-editor.tsx`):

1. Adicionar CSS para que paragrafos vazios (`<p>` sem conteudo) tenham altura minima, replicando o comportamento do editor:

```text
// Adicionar ao className do WysiwygContent:
'[&_p:empty]:min-h-[1em]'

// Trocar:
'prose-p:my-1 prose-ul:my-1 prose-li:my-0'
// Por:
'prose-p:my-2 prose-ul:my-2 prose-li:my-0 [&_p:empty]:min-h-[1em]'
```

Isso garante que paragrafos vazios usados como espacamento no editor tambem aparecam na versao compartilhavel.

## Problema 2: Erro de build em Services.tsx

O ultimo diff introduziu um erro de sintaxe na linha 422: `<div className="gap4 border"` esta sem o `>` de fechamento da tag. Isso causa os erros TS2657/TS1003.

### Solucao

Corrigir a tag quebrada: adicionar `>` para fechar a abertura da div e corrigir a classe CSS `gap4` para `gap-4`.

## Secao Tecnica

```text
Arquivos modificados:

1. src/components/ui/wysiwyg-editor.tsx
   - WysiwygContent: trocar prose-p:my-1 por prose-p:my-2
   - WysiwygContent: adicionar [&_p:empty]:min-h-[1em]
   - Manter mesmas classes no editor (WysiwygEditor) para consistencia

2. src/pages/Services.tsx
   - Linha 422: corrigir <div className="gap4 border" para <div className="gap-4 border">
```


# Plano: Corrigir fluxo de criacao de proposta e link compartilhado

## Resumo

Dois problemas precisam ser resolvidos: um erro de build que impede a compilacao e a falta de conteudo de template na visualizacao publica de propostas.

## Problema 1 - Erro de build em Services.tsx

Na pagina de servicos, ao atualizar itens de propostas em rascunho, o campo `items` recebe um array tipado como `ProposalItem[]`, que nao e compativel com o tipo `Json` esperado pelo banco de dados.

### Correcao

Adicionar `import type { Json } from '@/integrations/supabase/types'` e aplicar cast `as unknown as Json` na linha 278 de `Services.tsx`.

## Problema 2 - Template nao aparece no link publico

Atualmente, a funcao RPC `get_proposal_by_token` retorna apenas os campos da tabela `proposals`, sem fazer JOIN com `proposal_templates`. Isso significa que o campo `template_content` nunca chega ao frontend na pagina publica, e o conteudo do template (com variaveis dinamicas como `{{nome_cliente}}`, `{{valor_total}}`, etc.) nunca e renderizado.

O sistema possui um mecanismo de fallback (`share_static_html`) que gera um HTML estatico no momento do envio, mas isso depende de uma coluna que pode nao existir no banco. Alem disso, o HTML estatico nao permite interacao dinamica nem atualizacoes posteriores.

### Correcao

Atualizar a funcao RPC `get_proposal_by_token` para:
- Fazer LEFT JOIN com `proposal_templates` usando o campo `template_id` da proposta
- Retornar o campo `template_content` (vindo de `proposal_templates.description`) na resposta

Isso permitira que a pagina publica renderize o template com as variaveis preenchidas dinamicamente.

## Secao Tecnica

### Arquivo: src/pages/Services.tsx

- Adicionar import de `Json` do supabase types
- Linha 278: alterar `items: updatedItems` para `items: updatedItems as unknown as Json`

### Migracao SQL: Atualizar RPC get_proposal_by_token

```text
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text)
  RETURNS TABLE(
    proposal_id uuid, title text, description text,
    recipient_name text, recipient_email text, recipient_company text,
    items jsonb, total_hours numeric, total_value numeric,
    status text, valid_until date, created_at timestamptz,
    template_content text
  )
  -- Adiciona LEFT JOIN com proposal_templates
  -- Retorna pt.description AS template_content
  -- Usa aliases explicitos (p.) para evitar ambiguidade
```

### Arquivo: src/pages/PublicProposal.tsx

Nenhuma alteracao necessaria - ja possui o campo `template_content` opcional na interface `ProposalData` e logica de renderizacao condicional.


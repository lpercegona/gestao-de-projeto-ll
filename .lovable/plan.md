

# Correcao: Link compartilhavel independente de email + campos editaveis nos itens

## Problema 1: Link compartilhavel depende de envio de email

Atualmente, o link publico de proposta so e liberado apos clicar "Enviar", que obrigatoriamente envia o email E atualiza o status para "sent". No card da proposta em status "draft", aparece a mensagem "A pagina de compartilhamento sera criada apos o envio" e o botao de copiar link so aparece para status != draft.

Para contratos, o comportamento e similar: o botao "Enviar" manda o email e muda o status, e o botao de copiar link so aparece para status != draft.

## Solucao 1: Separar compartilhamento do envio de email

### Propostas (`src/pages/Proposals.tsx`)

1. **Remover a dependencia do link com o envio de email**: O share_token ja existe no banco desde a criacao (gerado automaticamente pelo `DEFAULT gen_random_uuid()`). O link ja funciona tecnicamente pois a RPC `get_proposal_by_token` nao verifica status. Basta liberar a UI.

2. **Mostrar o link e botao de copiar para TODAS as propostas**, incluindo drafts:
   - Remover a condicao `proposal.status === 'draft'` que mostra "A pagina de compartilhamento sera criada apos o envio" (linhas 1257-1272)
   - Sempre mostrar o link clicavel com botao de copiar
   - Remover a condicao `proposal.status !== 'draft'` do botao de copiar link (linhas 1288-1300)

3. **Mover o botao "Enviar" para o dropdown menu lateral**:
   - Remover o botao "Enviar" destacado que aparece para drafts (linhas 1276-1286)
   - Adicionar "Enviar por email" no DropdownMenu (ja existe "Reenviar por email" na linha 1332-1335, basta ajustar o label dinamicamente)

4. **Ao salvar proposta**: gerar o `share_static_html` imediatamente no `handleSaveProposal`, em vez de gerar apenas no envio. Isso garante que o link publico funcione sem depender do email.

5. **Ajustar o `handleSendProposal`**: manter a logica de envio de email, mas remover a obrigatoriedade — email vira uma acao opcional no menu.

### Contratos (`src/pages/Contracts.tsx`)

1. **Mostrar botao de copiar link para TODOS os contratos**, incluindo drafts:
   - Remover a condicao `contract.status !== 'draft'` (linhas 746-758)

2. **Mover o botao "Enviar" para o dropdown menu**:
   - Remover o botao "Enviar" destacado para drafts (linhas 730-744)
   - Adicionar "Enviar por email" no DropdownMenu (linha 766)

---

## Problema 2: Campos dos itens de proposta nao sao editaveis

Na linha 1608, os campos de servico, descricao, horas e preco sao renderizados como `<p>` (texto estatico em `bg-muted/30`), nao como `<Input>`. Apos adicionar um item do catalogo, o usuario nao consegue alterar os valores.

## Solucao 2: Tornar campos dos itens editaveis

Substituir os elementos `<p>` por `<Input>` para os 4 campos de cada item (servico, descricao, horas, preco/hora), com `onChange` que atualiza o `formData.items` pelo indice.

---

## Secao Tecnica

```text
Arquivos modificados:
  - src/pages/Proposals.tsx
    1. handleSaveProposal: gerar share_static_html ao salvar (nao apenas ao enviar)
    2. Card da proposta: remover condicao de draft para link/copiar
    3. Mover botao Enviar para dropdown (label dinamico "Enviar por email")
    4. Itens do formulario: trocar <p> por <Input> com onChange

  - src/pages/Contracts.tsx
    1. Card do contrato: remover condicao de draft para copiar link
    2. Mover botao Enviar para dropdown menu
    3. Adicionar "Enviar por email" no DropdownMenu

Nenhuma migracao SQL necessaria.
O share_token ja e gerado automaticamente pelo banco.
A RPC get_proposal_by_token ja funciona sem verificar status.
```




# Plano: Corrigir Compartilhamento de Propostas e Erros de Build

## Diagnostico

A funcionalidade de compartilhamento de propostas esta configurada corretamente em termos de rota (`/proposal/:token`), RPCs (`get_proposal_by_token`, `respond_to_proposal`, `get_proposal_comments_by_token`) e logica de validacao de acesso por email. Porem, **o aplicativo inteiro nao compila** devido a multiplos erros de TypeScript espalhados pelo codigo, impedindo qualquer funcionalidade de funcionar.

## Problemas Identificados

### 1. Erros de build que impedem a compilacao (criticos)

- **Proposals.tsx**: O tipo `Record<string, unknown>[]` dos itens nao e compativel com o tipo `Json` esperado pelo Supabase ao inserir/atualizar propostas.
- **SolicitacoesPanel.tsx**: Query tenta fazer join entre `edit_requests` e `clients`, mas nao existe chave estrangeira (FK) entre essas tabelas.
- **ProfileEditTab.tsx**: Tipo `IdentityAttachment[]` nao e compativel com `Json` ao chamar RPC.
- **DataContext.tsx**: Tipo `identity_attachments` retornado como `Json` nao corresponde ao tipo esperado na interface `Client`.
- **CalendarPage.tsx**: Variante `"primary"` nao existe no componente Button.

### 2. Template content nao carregado na visualizacao publica (menor)

A RPC `get_proposal_by_token` nao retorna `template_content`. O codigo trata isso graciosamente (fallback para `description`), entao nao causa erro, mas templates com variaveis como `{{nome_cliente}}` nunca sao renderizados na pagina publica.

## Plano de Correcao

### Passo 1 - Criar FK entre edit_requests/project_requests e clients (migracao SQL)

Adicionar chaves estrangeiras de `edit_requests.client_id` e `project_requests.client_id` apontando para `clients.id`, permitindo que as queries com join funcionem.

### Passo 2 - Corrigir tipos em Proposals.tsx

Usar cast `as unknown as Json` no campo `items` ao inserir/atualizar propostas, resolvendo a incompatibilidade entre `Record<string, unknown>[]` e `Json`.

### Passo 3 - Corrigir tipos em ProfileEditTab.tsx

Aplicar cast adequado nos parametros `p_identity_attachments` ao chamar a RPC, convertendo `IdentityAttachment[]` para tipo compativel com `Json`.

### Passo 4 - Corrigir tipo identity_attachments em DataContext.tsx e types/index.ts

Atualizar a interface `Client` para aceitar o campo `identity_attachments` como retornado pelo banco, ou aplicar cast nos pontos de conversao.

### Passo 5 - Corrigir variante do Button em CalendarPage.tsx

Substituir `variant="primary"` por `variant="default"` (que usa a cor primaria do tema).

### Passo 6 - (Opcional) Atualizar RPC para incluir template content

Alterar a funcao `get_proposal_by_token` para fazer JOIN com `proposal_templates` e retornar o conteudo do template, permitindo que propostas com templates renderizem corretamente na pagina publica.

## Secao Tecnica

```text
Arquivos a modificar:
  - src/pages/Proposals.tsx (linhas 291, 308 - cast items)
  - src/components/dashboard/SolicitacoesPanel.tsx (linha 113 - cast ou refatorar query)
  - src/components/settings/ProfileEditTab.tsx (linhas 246, 269 - cast attachments)
  - src/contexts/DataContext.tsx (linhas 345, 374 - cast client)
  - src/types/index.ts (adicionar identity_attachments ao Client)
  - src/pages/CalendarPage.tsx (linha 255 - trocar variant)

Migracao SQL:
  - ALTER TABLE edit_requests ADD CONSTRAINT fk_edit_requests_client
      FOREIGN KEY (client_id) REFERENCES clients(id);
  - ALTER TABLE project_requests ADD CONSTRAINT fk_project_requests_client
      FOREIGN KEY (client_id) REFERENCES clients(id);
```




# Revisao Completa: Erros e Vulnerabilidades de Seguranca

## Erros Funcionais Encontrados

### 1. Coluna `share_static_html` nao existe no banco (CRITICO)

O codigo em `Proposals.tsx` (linha 565) tenta gravar `share_static_html` na tabela `proposals`, mas essa coluna nao existe. O fallback `isMissingShareStaticHtmlColumnError` mascara o erro silenciosamente. Em `PublicProposal.tsx`, o campo `share_static_html` e referenciado mas nunca tera valor.

**Correcao:** Remover toda referencia a `share_static_html` do codigo (Proposals.tsx e PublicProposal.tsx). A renderizacao publica ja funciona via `template_content` retornado pela RPC. Alternativamente, criar a coluna se o recurso for desejado.

### 2. Tabela `task_timers` - colunas ausentes (CRITICO)

O codigo espera colunas `paused_at`, `paused_elapsed_seconds`, `task_title_snapshot`, `task_description_snapshot`, `project_name_snapshot`, `client_name_snapshot`, mas a tabela so possui `id`, `task_id`, `user_id`, `started_at`, `created_at`. Isso faz com que pausar/retomar timers falhe e snapshots nunca sejam salvos.

**Correcao:** Criar migracao SQL adicionando as colunas faltantes:
```text
ALTER TABLE task_timers
  ADD COLUMN paused_at timestamptz,
  ADD COLUMN paused_elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN task_title_snapshot text,
  ADD COLUMN task_description_snapshot text,
  ADD COLUMN project_name_snapshot text,
  ADD COLUMN client_name_snapshot text;
```

### 3. RPCs inexistentes chamadas pelo codigo (CRITICO)

- `update_client_company_settings` - chamada em ProfileEditTab.tsx (linha 141)
- `update_client_identity_settings` - chamada em ProfileEditTab.tsx (linhas 244, 267)

Essas funcoes nao existem no banco, causando erro ao salvar configuracoes de empresa e identidade visual no perfil do cliente.

**Correcao:** Criar as RPCs ou substituir por queries diretas com RLS adequada.

### 4. Colunas `identity_guidelines` e `identity_attachments` ausentes na tabela `clients`

O ProfileEditTab.tsx referencia esses campos, mas eles nao existem na tabela `clients`.

**Correcao:** Adicionar as colunas na migracao ou remover a funcionalidade do frontend.

### 5. Bucket de storage `client-identity-files` nao existe

O ProfileEditTab.tsx faz upload para um bucket que nao foi criado. Buckets existentes: `avatars`, `client-logos`.

**Correcao:** Criar o bucket ou remover a funcionalidade.

### 6. Rota duplicada no App.tsx (MENOR)

Linhas 130-139: a rota `/calendar` esta duplicada, ocupando espaco desnecessario.

**Correcao:** Remover a rota duplicada (linhas 135-139).

## Vulnerabilidades de Seguranca

### 7. XSS em paginas publicas (CRITICO)

Em `PublicProposal.tsx`:
- Linha 435: `dangerouslySetInnerHTML={{ __html: proposal.share_static_html }}` - sem sanitizacao
- Linha 449: `dangerouslySetInnerHTML={{ __html: proposal.description }}` - sem sanitizacao
- Linha 499: `dangerouslySetInnerHTML={{ __html: renderedTemplateContent }}` - sem sanitizacao

Conteudo vindo do banco (description, template_content) e inserido diretamente no DOM sem DOMPurify. Um admin malicioso ou comprometimento do banco permitiria injecao de scripts em paginas publicas acessadas por clientes.

Em `PublicContract.tsx`:
- Linha 329: `processContent(contract.content)` e renderizado sem sanitizacao (mas via texto, nao innerHTML - menor risco).

**Correcao:** Importar DOMPurify e sanitizar todo HTML antes de usar `dangerouslySetInnerHTML` nas paginas publicas.

### 8. Validacao de email do cliente e feita no frontend (MEDIO)

Em `PublicProposal.tsx` (linha 310), a verificacao de acesso compara o email digitado com `proposal.recipient_email` localmente. Como os dados da proposta ja foram carregados ANTES da validacao (fetchProposal roda no useEffect), um usuario pode inspecionar o DOM/rede e ver todos os dados sem validar o email.

**Correcao:** Mover a validacao para o backend - a RPC `get_proposal_by_token` deveria aceitar um parametro `p_email` e so retornar dados se o email corresponder.

### 9. Rate limiting apenas no frontend (MEDIO)

A funcao `checkRateLimit` em Login.tsx (linha 151) usa `localStorage`, que pode ser facilmente contornado limpando o storage ou usando outro navegador.

**Correcao:** A RPC `check_client_email` ja implementa `pg_sleep` para mitigar timing attacks, o que e adequado server-side. O rate limit client-side e apenas uma camada adicional, nao critica.

### 10. Leaked Password Protection desabilitada (MEDIO)

A verificacao de seguranca indicou que a protecao contra senhas vazadas esta desabilitada.

**Correcao:** Habilitar nas configuracoes de autenticacao.

### 11. Senhas de report_shares potencialmente expostas (MENOR)

Clientes com acesso podem ver a coluna `share_password` da tabela `report_shares`. Conforme verificado, as senhas sao hasheadas com bcrypt via `hash_report_password`, e a verificacao usa `verify_report_password` (SECURITY DEFINER). Porem, o hash em si e acessivel via SELECT.

**Correcao:** Considerar restringir SELECT na coluna `share_password` usando uma view.

## Secao Tecnica - Resumo de Arquivos a Modificar

```text
ERROS FUNCIONAIS:
1. src/pages/Proposals.tsx - Remover share_static_html (linhas 113, 207-249, 271-299, 558-600)
2. src/pages/PublicProposal.tsx - Remover share_static_html (linhas 71, 115, 179, 430-438)
3. Migracao SQL - Adicionar colunas em task_timers (6 colunas)
4. Migracao SQL - Adicionar colunas identity_guidelines/identity_attachments em clients
5. Migracao SQL - Criar RPCs update_client_company_settings e update_client_identity_settings
6. Migracao SQL ou config - Criar bucket client-identity-files
7. src/App.tsx - Remover rota duplicada /calendar (linhas 135-139)

SEGURANCA:
8. src/pages/PublicProposal.tsx - Sanitizar HTML com DOMPurify
9. Migrar validacao de email da proposta para o backend (RPC)
10. Habilitar leaked password protection
```


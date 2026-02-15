
# Plano: Corrigir Proposta Publica + Templates por Secoes + Email

## Diagnostico

### 1. Erro no link publico da proposta
Existem **duas funcoes** `get_proposal_by_token` no banco: uma que recebe apenas `(p_token text)` e outra que recebe `(p_token text, p_email text DEFAULT NULL)`. Quando o PostgREST recebe a chamada com apenas `p_token`, nao consegue decidir qual funcao usar, gerando erro de ambiguidade. A funcao de 2 argumentos ja cobre o caso sem email (o parametro tem DEFAULT NULL), tornando a de 1 argumento redundante.

Alem disso, o codigo referencia a coluna `share_static_html` na tabela `proposals`, mas essa coluna nao existe no banco.

### 2. Templates atualmente limitados
A edicao de templates usa apenas titulo + WYSIWYG (campo `description` do tipo text). Nao ha suporte a secoes estruturadas.

### 3. Estrutura visual do link publico
O layout atual mistura header, template, itens e acoes sem separacao clara entre conteudo do template e estrutura fixa (header/footer).

### 4. Envio de email
Nao existe nenhuma funcao de envio de email. O botao "Enviar" apenas muda o status para "sent".

---

## Correcoes e Implementacoes

### Passo 1 - Corrigir erro do banco de dados (Migracao SQL)

- **Dropar** a funcao `get_proposal_by_token(text)` (1 argumento), mantendo apenas `get_proposal_by_token(text, text)` que ja trata o caso com e sem email.
- **Adicionar** a coluna `share_static_html` na tabela `proposals` como `text NULL DEFAULT NULL` para que o codigo existente funcione sem erro.

```text
DROP FUNCTION IF EXISTS public.get_proposal_by_token(text);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS share_static_html text DEFAULT NULL;
```

### Passo 2 - Reestruturar templates para edicao por secoes (Migracao SQL + Frontend)

**Banco de dados:**
- Adicionar coluna `sections` (jsonb, default `'[]'`) na tabela `proposal_templates` para armazenar secoes estruturadas.
- O campo `description` existente continua como fallback para templates antigos.

**Estrutura de cada secao:**
```text
{
  "id": "uuid",
  "type": "title" | "text" | "image",
  "content": "texto ou URL da imagem",
  "order": 0
}
```

**Frontend - Editor de Templates (Proposals.tsx, area do template):**
- Substituir o campo WYSIWYG unico por uma interface de secoes.
- Cada secao tem botoes para mover (cima/baixo) e remover.
- Botao "Adicionar secao" com opcoes: Titulo, Texto (WYSIWYG), Imagem (upload para bucket).
- Secoes de titulo renderizam como `<h2>`.
- Secoes de texto renderizam como conteudo WYSIWYG.
- Secoes de imagem renderizam como `<img>` com largura maxima do layout (max-w-4xl).

**Bucket de storage:**
- Criar bucket `proposal-images` (publico) para armazenar imagens dos templates.

### Passo 3 - Reestruturar layout do link publico (PublicProposal.tsx)

A nova estrutura sera:

```text
+------------------------------------------+
| HEADER: Logo + Status Badge              |
+------------------------------------------+
| Aviso de expiracao (se aplicavel)         |
+------------------------------------------+
| DETALHES DO CLIENTE                       |
| Nome, Email, Empresa, Validade            |
+------------------------------------------+
| CONTEUDO DO TEMPLATE (secoes)             |
| Titulo / Texto / Imagem (renderizados    |
| conforme as secoes do template)           |
| + fallback para description WYSIWYG      |
| de templates antigos                      |
+------------------------------------------+
| ITENS E PRECIFICACAO (FOOTER)             |
| Tabela de servicos + Totais               |
+------------------------------------------+
| ACOES                                     |
| Aceitar / Negociar / Recusar / Comentar   |
+------------------------------------------+
| COMENTARIOS (se houver)                   |
+------------------------------------------+
| RODAPE                                    |
| Data de geracao + info da plataforma      |
+------------------------------------------+
```

- O conteudo do template (secoes) fica entre header/detalhes e o footer de itens.
- A funcao `renderTemplateContent` sera adaptada para renderizar secoes quando disponiveis, com fallback para o conteudo WYSIWYG antigo.
- Campos dinamicos (`{{nome_cliente}}`, etc.) continuam funcionando dentro de secoes de texto.

### Passo 4 - Funcao de envio de email (Edge Function)

Criar edge function `send-proposal-email`:
- Recebe `proposal_id` no body.
- Busca dados da proposta e template via service role.
- Monta o email HTML com o link publico.
- Envia via Resend ou servico similar (sera necessario configurar API key).
- Atualiza status da proposta para "sent".
- O conteudo do email segue um template editavel armazenado no banco.

**Tabela `email_templates` (nova, migracao SQL):**
```text
- id: uuid (PK)
- slug: text UNIQUE (ex: 'proposal_sent', 'contract_sent')
- subject: text
- body_html: text (conteudo WYSIWYG com campos dinamicos)
- created_at, updated_at: timestamp
- owner_id: uuid
```

RLS: apenas admin/master_admin podem gerenciar.

### Passo 5 - Aba de Notificacoes em Configuracoes (Preferences.tsx)

- Adicionar nova aba "Notificacoes" (icone Bell) na pagina de Configuracoes, visivel apenas para admin/master_admin.
- Componente `NotificationTemplatesTab` que lista os templates de email.
- Cada template mostra: nome amigavel, assunto, e editor WYSIWYG para o corpo.
- Campos dinamicos disponiveis para cada tipo de template (ex: para proposta: `{{nome_cliente}}`, `{{link_proposta}}`, `{{titulo_proposta}}`).
- Botao de salvar por template individual.
- Templates seed iniciais criados via migracao: `proposal_sent`, `contract_sent`.

---

## Secao Tecnica

```text
Migracoes SQL:
  1. DROP FUNCTION get_proposal_by_token(text) - remove funcao duplicada
  2. ALTER TABLE proposals ADD COLUMN share_static_html text
  3. ALTER TABLE proposal_templates ADD COLUMN sections jsonb DEFAULT '[]'
  4. CREATE TABLE email_templates (id, slug, subject, body_html, owner_id, created/updated_at)
     + RLS policies para admin/master_admin
     + INSERT seed para templates iniciais
  5. INSERT INTO storage.buckets (id, name, public) VALUES ('proposal-images', 'proposal-images', true)
     + RLS policies para upload por admin

Arquivos a criar:
  - supabase/functions/send-proposal-email/index.ts
  - src/components/settings/NotificationTemplatesTab.tsx

Arquivos a modificar:
  - src/pages/PublicProposal.tsx (reestruturar layout, renderizar secoes)
  - src/pages/Proposals.tsx (editor de templates por secoes, chamar edge function ao enviar)
  - src/pages/Preferences.tsx (adicionar aba Notificacoes)

Dependencias externas:
  - API key de servico de email (Resend recomendado)
    Sera solicitada ao usuario antes de implementar o envio
```

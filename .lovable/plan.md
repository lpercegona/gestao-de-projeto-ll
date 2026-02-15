# Plano: Correcoes e Evolucao do Sistema de Propostas e Contratos

## **1. Corrigir erro de build da Edge Function sem uso de serviços intermediários e mantendo as credenciais já cadastradas**

**Problema identificado**  
O erro de build ocorre porque a dependência `nodemailer@6` depende de APIs nativas do **Node.js**, incompatíveis com o runtime **Deno** utilizado pelo Lovable Cloud nas Edge Functions.  
A tentativa de resolver via CDN externa (como `esm.sh`) introduz dependência desnecessária de serviço intermediário.

**Diretriz de correção**  
A correção deve:

- **eliminar o uso do** `nodemailer`
- **manter as credenciais SMTP já configuradas no projeto**
- **evitar dependência de CDNs ou serviços de terceiros**
- **garantir compatibilidade nativa com Deno**

**Ajuste técnico necessário**

 substituir a lógica de envio por implementação **compatível com Deno**, utilizando:

- cliente SMTP nativo para Deno **ou**
- requisição direta ao endpoint HTTP do próprio servidor de e-mail (quando disponível),

sempre reutilizando:

```
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS

```

já definidos nas variáveis de ambiente do projeto.

**Resultado esperado**

- Correção definitiva do erro de build no ambiente Deno.
- Preservação integral das credenciais de e-mail existentes.
- Remoção de dependência de `nodemailer` e de serviços externos como `esm.sh`.
- Maior estabilidade arquitetural da Edge Function.

---

## 2. Corrigir imagens no link publico da proposta

**Problema:** O codigo do `PublicProposal.tsx` tenta buscar `proposal_templates` diretamente via `supabase.from('proposal_templates')`, mas essa tabela tem RLS que so permite acesso a admins. Usuarios nao logados nao conseguem carregar as secoes do template (incluindo imagens).

**Solucao:** Alterar a RPC `get_proposal_by_token` para retornar tambem as secoes do template, eliminando a necessidade de consulta direta a tabela.

**Migracao SQL:**

- Alterar `get_proposal_by_token` para incluir coluna `template_sections jsonb` no retorno, fazendo JOIN com `proposal_templates` para buscar `sections`.

**Frontend (`PublicProposal.tsx`):**

- Remover a consulta direta a `proposals` e `proposal_templates` (linhas 161-177).
- Usar `template_sections` retornado pela RPC.

---

## 3. Cadastro automatico de cliente ao criar proposta

Quando uma nova proposta e criada, se nao houver `client_id` vinculado e o email do destinatario nao corresponder a nenhum cliente existente, criar automaticamente um cliente com `pipeline_status = 'negotiation'`.

**Logica de categorizacao:**

- Se os itens da proposta indicarem servico unico: `contract_type = 'one_time'`
- Se indicarem plano mensal: `contract_type = 'monthly'`
- O usuario escolhe o tipo na criacao da proposta (adicionar campo `contract_type` ao formulario)

**Implementacao:** Trigger SQL `after insert` na tabela `proposals` ou logica no frontend (Proposals.tsx) apos salvar a proposta.

**Frontend - Proposals.tsx:**

- Adicionar campo "Tipo de Contrato" (Unico / Mensal) ao formulario de criacao de proposta
- Apos criar proposta sem `client_id`, buscar se ja existe cliente com mesmo email; se nao, inserir novo cliente com:
  - `name`: recipient_name
  - `email`: recipient_email  
  - `company`: recipient_company
  - `pipeline_status`: 'negotiation'
  - `contract_type`: conforme selecao
  - `owner_id`: user.id
  - `created_by`: user.id

---

## 4. Campos CNPJ/CPF no perfil do admin

**Migracao SQL:**

- Adicionar colunas na tabela `profiles`:
  - `cnpj text`
  - `cpf text`
  - `company_name text`
  - `company_address text`

**Frontend - ProfileEditTab.tsx:**

- Para usuarios admin/master_admin, exibir campos adicionais: CNPJ, CPF, Nome da Empresa e Endereco da Empresa na aba "Perfil"
- Salvar via update na tabela `profiles`

---

## 5. Campos adicionais no cliente

**Migracao SQL:**

- Adicionar colunas na tabela `clients`:
  - `cnpj text`
  - `cpf_responsavel text`
  - `endereco text`
  - `responsavel_name text` (caso diferente do nome do contato)

**Frontend - ClientDetail.tsx / formularios de cliente:**

- Exibir e permitir edicao dos novos campos

---

## 6. Reestruturar templates de contrato (secoes)

Alinhar com o sistema de propostas, usando secoes estruturadas (titulo, texto WYSIWYG, imagem).

**Migracao SQL:**

- Adicionar coluna `sections jsonb DEFAULT '[]'` na tabela `contract_templates`

**Frontend - Contracts.tsx (aba Templates):**

- Substituir textarea unico pelo `TemplateSectionEditor` (mesmo componente usado em propostas)
- Manter campo `content` como fallback para templates antigos

---

## 7. Contratos: envio por email e variaveis dinamicas expandidas

**Edge Function - criar `send-contract-email/index.ts`:**

- Mesma estrutura do `send-proposal-email`, mas para contratos
- Busca template de email com slug `contract_sent`
- Envia link publico do contrato por email via SMTP

**Migracao SQL:**

- Inserir seed do template de email `contract_sent` na tabela `email_templates`

**Frontend - Contracts.tsx:**

- Botao "Enviar" chama a edge function para enviar email + atualizar status
- Variaveis dinamicas expandidas para incluir:
  - `{{admin_company}}`, `{{admin_cnpj}}`, `{{admin_cpf}}`, `{{admin_name}}`, `{{admin_address}}`
  - `{{contractor_cnpj}}`, `{{contractor_cpf}}`, `{{contractor_address}}`
  - Alem das existentes

**Frontend - Contracts.tsx (formulario de criacao):**

- Adicionar campos: CNPJ do cliente, CPF do responsavel, CPF de testemunha
- Carregar automaticamente dados do admin logado (CNPJ, CPF, empresa) dos campos do perfil

---

## 8. Assinatura digital com desenho (canvas)

**Novo componente: `SignatureCanvas.tsx**`

- Canvas HTML5 para desenhar assinatura com o mouse/touch
- Botoes: "Limpar" e "Confirmar"
- Retorna imagem da assinatura como data URL (base64 PNG)
- Responsivo para mobile

**Migracao SQL - tabela `contracts`:**

- Adicionar colunas:
  - `admin_signature_url text` (URL da imagem no storage)
  - `client_signature_url text`
  - `witness_signature_url text`
  - `witness_name text`
  - `witness_cpf text`
  - `witness_ip text`
  - `admin_signed_at timestamptz`
  - `client_signed_at timestamptz`
  - `witness_signed_at timestamptz`

**Bucket de storage:**

- Criar bucket `contract-signatures` (privado) para armazenar imagens de assinatura

**Fluxo de assinatura no link publico (PublicContract.tsx):**

1. Cliente abre modal de assinatura
2. Preenche dados (nome, CPF, endereco)
3. Desenha assinatura no canvas
4. Aceita termos
5. Ao confirmar: upload da imagem para storage, chama RPC `sign_contract` atualizada
6. Opcionalmente, adicionar campo de testemunha (nome, CPF, assinatura)

**Assinatura do admin (Contracts.tsx):**

- Botao "Assinar como Admin" no card do contrato (quando status = draft ou sent)
- Abre modal com canvas de assinatura
- Salva no banco e storage

**RPC `sign_contract` atualizada:**

- Receber parametro `p_signature_type` ('admin', 'client', 'witness')
- Atualizar a coluna correspondente
- Quando admin E cliente ja assinaram, marcar status como 'signed'

---

## 9. Exportacao em PDF com assinaturas

**Abordagem:** Usar `window.print()` com CSS de impressao otimizado, incluindo as imagens de assinatura renderizadas no layout.

**PublicContract.tsx:**

- Quando contrato estiver assinado (admin + cliente), exibir secao de assinaturas com as imagens
- Botao "Exportar PDF" aciona `window.print()` com layout formatado para impressao
- Layout de impressao inclui: conteudo do contrato, servicos, assinaturas lado a lado, dados dos signatarios

---

## 10. Layout do PublicContract.tsx reestruturado

Nova estrutura alinhada com PublicProposal:

```text
+------------------------------------------+
| HEADER: Logo + Status                    |
+------------------------------------------+
| DETALHES DAS PARTES                       |
| Admin (empresa, CNPJ) | Cliente (empresa) |
+------------------------------------------+
| CONTEUDO DO TEMPLATE (secoes)             |
| Titulo / Texto / Imagem                  |
+------------------------------------------+
| CONDICOES DE PAGAMENTO                   
+------------------------------------------+
| ASSINATURAS (quando assinado)             |
| Admin | Cliente | Testemunha (opcional)   |
+------------------------------------------+
| ACOES (Assinar / Exportar PDF)            |
+------------------------------------------+
```

---

## Secao Tecnica - Resumo de Alteracoes

```text
Migracoes SQL:
  1. ALTER profiles ADD COLUMN cnpj, cpf, company_name, company_address
  2. ALTER clients ADD COLUMN cnpj, cpf_responsavel, endereco, responsavel_name
  3. ALTER contract_templates ADD COLUMN sections jsonb DEFAULT '[]'
  4. ALTER contracts ADD COLUMN admin_signature_url, client_signature_url, 
     witness_signature_url, witness_name, witness_cpf, witness_ip,
     admin_signed_at, client_signed_at, witness_signed_at,
     admin_cnpj, admin_cpf, admin_company, admin_address,
     contractor_cnpj, contractor_cpf_responsavel, witness_cpf_field
  5. CREATE bucket contract-signatures (privado) + RLS
  6. UPDATE get_proposal_by_token para retornar template_sections
  7. UPDATE sign_contract para suportar tipos de assinatura
  8. INSERT email_templates seed para 'contract_sent'

Arquivos a criar:
  - src/components/contracts/SignatureCanvas.tsx
  - supabase/functions/send-contract-email/index.ts

Arquivos a modificar:
  - supabase/functions/send-proposal-email/index.ts (fix import)
  - src/pages/PublicProposal.tsx (usar RPC para secoes)
  - src/pages/PublicContract.tsx (assinaturas, layout, PDF)
  - src/pages/Contracts.tsx (templates por secoes, envio email, assinatura admin, campos expandidos)
  - src/pages/Proposals.tsx (cadastro auto de cliente, campo tipo contrato)
  - src/components/settings/ProfileEditTab.tsx (campos CNPJ/CPF para admin)

Obs: Devido ao volume de alteracoes, a implementacao sera feita em etapas 
sequenciais para garantir estabilidade.
```
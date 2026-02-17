
# Plano: Corrigir envio de email de propostas e contratos para admins

## Diagnostico

Foram identificados **3 problemas distintos** que impedem o envio de emails:

### Problema 1: Erro SMTP com TLS (afeta TODAS as funcoes)

Os logs mostram erro `BadResource: Bad resource ID` em `Object.startTls`. O runtime Deno do Supabase Edge nao suporta corretamente o `startTls` (STARTTLS na porta 587). A biblioteca denomailer tenta abrir uma conexao TCP simples e depois fazer upgrade para TLS, mas o `Deno.startTls()` falha no edge runtime.

A configuracao atual usa `tls: smtp.port === 465`, ou seja, na porta 587 o `tls` fica `false` e o denomailer tenta STARTTLS, que falha.

**Solucao**: Forcar `tls: true` para todas as portas. Na porta 587, servidores SMTP modernos aceitam conexao TLS direta (implicit TLS). Isso contorna a limitacao do edge runtime.

### Problema 2: Campo errado no body do contrato

O frontend envia `contractId` mas a edge function espera `contract_id`:

```text
// Frontend (Contracts.tsx linha 383):
body: { contractId: contract.id, ... }

// Edge function (send-contract-email linha 39):
const { contract_id } = await req.json();
```

Resultado: `contract_id` chega como `undefined`, a funcao retorna erro 400.

### Problema 3: Contrato marcado como "enviado" mesmo com falha

No frontend (Contracts.tsx linhas 396-415), o bloco `catch` atualiza o status para "sent" como "fallback", mesmo quando o email falhou. Alem disso, a edge function tambem atualiza o status ANTES de tentar enviar o email (linha 104-107).

## Solucao Completa

### 1. Corrigir TLS em todas as 3 edge functions

Alterar a configuracao do SMTPClient para usar `tls: true` sempre, eliminando o problema de STARTTLS no edge runtime.

```text
// Antes:
tls: smtp.port === 465

// Depois:
tls: true
```

Arquivos:
- supabase/functions/send-proposal-email/index.ts
- supabase/functions/send-contract-email/index.ts
- supabase/functions/send-monthly-report/index.ts

### 2. Corrigir campo do body em send-contract-email

Na edge function, aceitar tanto `contract_id` quanto `contractId`:

```text
const body = await req.json();
const contract_id = body.contract_id || body.contractId;
```

### 3. Corrigir fluxo de status no contrato

**Na edge function** (send-contract-email): mover a atualizacao de status para DEPOIS do envio bem-sucedido do email (igual ao padrao da proposta).

**No frontend** (Contracts.tsx): remover o bloco catch que marca como "sent" em caso de falha. Mostrar toast de erro real ao usuario.

### 4. Nenhuma alteracao nas credenciais SMTP

A logica de resolucao de credenciais ja esta correta:
1. Busca smtp_settings global (owner_id IS NULL)
2. Se nao encontrar, usa variaveis de ambiente (SMTP_HOST, SMTP_USER, SMTP_PASS)

Essas credenciais sao compartilhadas com todos os admins. Apenas o `smtp_from_name` e resolvido individualmente por admin, exatamente como desejado.

## Secao Tecnica

```text
Arquivos a modificar:

1. supabase/functions/send-proposal-email/index.ts
   - Linha 192: trocar tls: smtp.port === 465 por tls: true

2. supabase/functions/send-contract-email/index.ts
   - Linha 39: aceitar contract_id ou contractId do body
   - Linhas 104-107: MOVER update de status para depois do envio bem-sucedido
   - Linha 143: trocar tls: smtp.port === 465 por tls: true

3. supabase/functions/send-monthly-report/index.ts
   - Localizar configuracao do SMTPClient e trocar tls por true

4. src/pages/Contracts.tsx
   - Linhas 381-383: corrigir body para usar contract_id
   - Linhas 394-415: remover catch que marca como "sent" em caso de falha
   - Mostrar toast.error em caso de erro real

Nenhuma migracao SQL necessaria.
```

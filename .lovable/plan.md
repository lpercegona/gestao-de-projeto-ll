

# Correcao: Manter porta 587 como primaria com fallback para 465

## Problema

O Deno Edge Runtime nao suporta STARTTLS (`Deno.startTls`), que e o metodo usado na porta 587. Isso gera erro `BadResource` ou `InvalidContentType`. A porta 465 (TLS implicito) funciona corretamente.

## Solucao

Manter a tentativa na porta 587 como primeira opcao. Se falhar (qualquer erro), tentar automaticamente na porta 465 com `tls: true`. Isso ja existe parcialmente no codigo atual, mas a logica de fallback so e acionada para o erro especifico `invalidcontenttype`. A correcao expande o fallback para **qualquer erro** na porta 587.

## Alteracoes

### 1. `supabase/functions/send-proposal-email/index.ts`

**createSmtpClient** (linhas ~185-193): manter como esta, recebendo `port` como parametro.

**Bloco catch** (linhas ~272-353): alterar a condicao de fallback. Remover a verificacao especifica de `invalidcontenttype` e acionar o fallback para qualquer erro quando a porta inicial nao for 465:

```text
// De:
const shouldTryFallback =
  (smtp.port || 587) === 587 &&
  String(emailErr).toLowerCase().includes("invalidcontenttype");

// Para:
const shouldTryFallback = preferredPort !== 465;
```

Isso garante que se a primeira tentativa (587) falhar por qualquer motivo, o sistema tenta na 465 com TLS implicito.

### 2. `supabase/functions/send-contract-email/index.ts`

Mesma alteracao no bloco catch (linhas ~174-216):

```text
// De:
const shouldTryFallback =
  (smtp.port || 587) === 587 &&
  String(emailErr).toLowerCase().includes("invalidcontenttype");

// Para:
const shouldTryFallback = preferredPort !== 465;
```

### 3. `supabase/functions/send-monthly-report/index.ts`

Localizar o bloco catch com a mesma logica de fallback e aplicar a mesma alteracao.

### 4. `supabase/functions/test-smtp-connection/index.ts`

Mesma alteracao: expandir fallback para qualquer erro quando porta inicial nao for 465.

## Secao Tecnica

```text
Arquivos modificados:
  - supabase/functions/send-proposal-email/index.ts
  - supabase/functions/send-contract-email/index.ts
  - supabase/functions/send-monthly-report/index.ts
  - supabase/functions/test-smtp-connection/index.ts

Mudanca em cada arquivo:
  1. Manter createSmtpClient recebendo port como parametro
  2. Manter tls: port === 465 (dinamico conforme a porta)
  3. No catch: trocar condicao de fallback para "preferredPort !== 465"
     em vez de verificar apenas "invalidcontenttype"
  4. Fallback usa porta 465 com tls: true (TLS implicito)

Comportamento final:
  - Tenta enviar na porta configurada (587 por padrao)
  - Se falhar (qualquer erro), tenta na porta 465 com TLS implicito
  - Se ja estiver na 465 e falhar, retorna o erro diretamente

Nenhuma migracao SQL necessaria.
Deploy automatico apos edicao.
```


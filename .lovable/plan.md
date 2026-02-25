

# Unificar test-smtp-connection com denomailer

## Contexto

Atualmente, a funcao `test-smtp-connection` usa uma implementacao manual com `Deno.connect` / `Deno.connectTls` para evitar o crash do denomailer. As outras 3 funcoes de envio (proposal, contract, monthly-report) ja usam denomailer normalmente. O objetivo e unificar tudo no denomailer, mantendo a simplicidade e o padrao defensivo de fechamento.

## Estrategia

Usar o denomailer no teste SMTP da mesma forma que nas funcoes de envio, porem com um `safeClose` defensivo e envio de um email de teste real (para o proprio remetente). Isso valida credenciais de forma concreta e elimina a implementacao manual de baixo nivel.

## Alteracoes

### 1. `supabase/functions/test-smtp-connection/index.ts`

Reescrever para usar denomailer com o padrao:

```text
+-----------------------------------------+
| SMTPClient (denomailer)                 |
| - Tenta porta preferida (587 default)   |
| - send() email de teste para si mesmo   |
| - safeClose() no finally                |
| - Fallback para 465 se falhar           |
+-----------------------------------------+
```

- Importar `SMTPClient` de `denomailer` (mesma versao das outras funcoes)
- Criar helper `safeClose(client)` que verifica se o cliente existe antes de chamar `.close()`
- Tentar `client.send(...)` com `to: smtp_user`, `from: smtp_user`, assunto `[TESTE SMTP] Conexao validada`
- No `catch`, tentar fallback 465 com mesmo padrao
- No `finally`, sempre chamar `safeClose`
- Retornar mensagens de erro limpas (sem stack trace)

### 2. `supabase/functions/send-proposal-email/index.ts`

- Adicionar helper `safeClose` no topo
- Substituir `try { await client.close(); } catch (_) {}` por `await safeClose(client)` nos blocos catch e finally (3 ocorrencias)

### 3. `supabase/functions/send-contract-email/index.ts`

- Mesmo ajuste: adicionar `safeClose` e substituir fechamentos diretos (3 ocorrencias)

### 4. `supabase/functions/send-monthly-report/index.ts`

- Mesmo ajuste: adicionar `safeClose` e substituir fechamentos diretos (3 ocorrencias)

### 5. `src/components/settings/SmtpSettingsSection.tsx`

- Sem alteracao necessaria -- o componente ja trata `result.success === false` com mensagens amigaveis e mapeia erros de auth/hostname/timeout.

## Helper safeClose (padrao compartilhado)

```typescript
async function safeClose(client: SMTPClient | null) {
  if (!client) return;
  try { await client.close(); } catch (_) { /* ignore */ }
}
```

## Riscos e mitigacao

- **Email de teste enviado a cada clique**: o assunto tera prefixo `[TESTE SMTP]` e corpo minimo, facilitando filtragem.
- **Provedores que bloqueiam autoenvio**: erro sera capturado e retornado como `success: false` com mensagem clara.
- **Denominaler crash no close**: o `safeClose` previne completamente esse cenario.

## Ordem de implementacao

1. Reescrever `test-smtp-connection` com denomailer + safeClose
2. Adicionar `safeClose` nas 3 funcoes de envio
3. Deploy automatico das edge functions


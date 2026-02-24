
## Objetivo

Eliminar o erro `TypeError: Cannot read properties of undefined (reading 'close')` no teste SMTP e estabilizar o fluxo para não gerar falha 500/erro de runtime quando a conexão falha parcialmente.

## Diagnóstico (o que foi verificado)

1. O erro foi confirmado nos logs do backend:
   - `SMTP fallback failed: TypeError: Cannot read properties of undefined (reading 'close')`
   - stack dentro de `denomailer` (`SMTPClient.close`).
2. A requisição do frontend para `test-smtp-connection` retorna HTTP 200 com:
   - `{ "success": false, "error": "TypeError: Cannot read properties of undefined (reading 'close')" }`
3. Causa raiz técnica:
   - O `denomailer` cria conexão de forma assíncrona no construtor.
   - O código atual testa conexão com `new SMTPClient(...)` seguido de `await client.close()`.
   - Em cenários de falha parcial/handshake, `close()` pode ser chamado antes da conexão interna existir, gerando `undefined.close`.
   - Isso também pode acontecer em `finally`/fallback em outros arquivos que usam o mesmo padrão de fechamento direto.

## Estratégia de correção

Trocar o teste baseado em “criar e fechar cliente” por teste real de envio controlado (que aguarda corretamente o estado interno do cliente), e padronizar fechamento defensivo em todos os fluxos SMTP.

## Mudanças planejadas

### 1) `supabase/functions/test-smtp-connection/index.ts` (correção principal)

- Substituir a validação atual (`create client -> close`) por:
  1. criar cliente na porta escolhida;
  2. executar `send(...)` para o próprio remetente (`to: smtp_user`, `from: smtp_user`) com assunto claro de teste;
  3. fechar com `safeClose` no `finally`.
- Manter fallback para 465 quando tentativa inicial falhar.
- Garantir que **nenhum** ponto use `await client.close()` diretamente sem wrapper.
- Retornar mensagens de erro limpas (sem stack crua) e manter `success: false` para falhas de autenticação/TLS.

Resultado esperado: elimina o `TypeError ... close` e transforma o teste em validação real de credenciais/conectividade SMTP.

### 2) Robustez adicional nas outras funções SMTP (preventivo recomendado)

Arquivos:
- `supabase/functions/send-proposal-email/index.ts`
- `supabase/functions/send-contract-email/index.ts`
- `supabase/functions/send-monthly-report/index.ts`

Ajustes:
- Introduzir `safeClose` igual ao padrão defensivo.
- Substituir fechamentos diretos em fallback/finally por `safeClose`.
- Evitar que erro no fechamento sobrescreva erro real de envio.

Resultado esperado: evita recorrência do mesmo bug em envios reais de proposta/contrato/relatório.

### 3) `src/components/settings/SmtpSettingsSection.tsx` (UX de erro)

- Melhorar o feedback do botão “Testar Conexão”:
  - quando `result.success === false`, exibir mensagem amigável (ex.: “Falha ao autenticar no servidor SMTP. Verifique host/porta/usuário/senha.”).
  - opcional: exibir quando houve fallback para 465 com sucesso.

Resultado esperado: o usuário vê erro útil, sem `TypeError` técnico.

## Sequência de implementação

1. Corrigir `test-smtp-connection` (principal).
2. Padronizar `safeClose` nas demais funções SMTP (preventivo).
3. Ajustar mensagens no frontend (`SmtpSettingsSection`).
4. Validar em ambiente:
   - porta 587 válida;
   - 587 falhando e 465 funcionando (fallback);
   - credenciais inválidas;
   - host inválido.

## Critérios de aceite

- Não aparece mais `TypeError: ... undefined (reading 'close')` no toast nem nos logs.
- Teste SMTP retorna:
  - `success: true` quando autentica/envia teste;
  - `success: false` com erro legível quando falha.
- Sem `UncaughtException` no runtime da função.
- Fluxo de fallback 465 permanece funcional.

## Riscos e mitigação

- Risco: envio de e-mail de teste a cada clique.
  - Mitigação: usar assunto/prefixo explícito de teste e corpo mínimo.
- Risco: provedores com política anti-spam para autoenvio.
  - Mitigação: tratar erro com mensagem clara; manter fallback de porta e resposta controlada.

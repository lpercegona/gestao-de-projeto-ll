

## Correção urgente: build quebrado por `date-fns` ausente

O build atual está falhando com **57 erros TS2307** porque o pacote `date-fns` não está mais resolvendo (provavelmente removido do `bun.lock` em uma edição anterior). Antes de qualquer melhoria de UI, é preciso restaurar a dependência — sem ela a plataforma inteira não compila e nada renderiza.

### Etapa 1 — Restaurar `date-fns` (bloqueante)

- Reinstalar `date-fns` (versão `^3.6.0`, compatível com `react-day-picker` 8 e o resto do projeto) via `package.json` + lockfile.
- Validar que `bun install` regenera `bun.lock` com a entrada correta.
- Verificar que os 57 arquivos listados no erro voltam a compilar (imports `from 'date-fns'` e `from 'date-fns/locale'`).

Sem isso, qualquer outra correção visual é inútil — a aplicação não roda.

### Etapa 2 — Auditoria de UI (após build verde)

Depois que o build voltar, faço varredura focada nos pontos historicamente problemáticos da plataforma, mantendo o estilo atual (Shadcn flat, fundo branco, sem sombras, FormSheet para edição):

1. **Responsividade mobile (360px — viewport atual do usuário):**
   - Modais sem `max-w-[95vw]` (padrão da memória `style/mobile-responsiveness-standards-v2`).
   - Botões de ação primária sem `w-full sm:w-auto` em mobile.
   - Headers de bloco com `flex justify-between` que comprimem em telas estreitas (precisam de `flex-col sm:flex-row`).

2. **Formatação de data inconsistente:**
   - Locais que exibem ISO cru (`2026-04-25`) em vez de `dd/MM/yyyy` com `date-fns`/`ptBR`.

3. **Inputs `type="date"` sem `min`:**
   - Campos de prazo que aceitam datas no passado.

4. **Páginas públicas sem branding:**
   - `PublicProjectRequest`, telas de erro/indisponibilidade sem logo Oras (consistência com Login/ResetPassword).

5. **Telas de sucesso sem ação de saída:**
   - Fluxos que terminam em "done" sem botão para continuar/reiniciar.

### Como vou proceder

1. Aplicar **apenas** a correção do `date-fns` primeiro (etapa 1).
2. Após confirmar o build, gerar **novo plano** com a lista exata de arquivos/linhas a ajustar na auditoria de UI (etapa 2), para você aprovar separadamente.

Isso evita misturar uma correção crítica de build com mudanças visuais opcionais.

### Arquivos editados nesta etapa

- `package.json` (adicionar `date-fns: ^3.6.0` em `dependencies`)
- `bun.lock` (regenerado automaticamente)


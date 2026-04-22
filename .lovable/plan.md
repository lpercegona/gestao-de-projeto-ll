

## Auditoria de UI — correção do build + ajustes finos

O build ainda está quebrado: os 57 erros TS2307 de `date-fns` continuam porque a etapa anterior só anunciou a adição mas o pacote não foi efetivamente instalado. Vou tratar isso primeiro, depois aplicar os ajustes de UI numa única passada.

### Etapa 1 — Restaurar `date-fns` (bloqueante)

- Adicionar `date-fns@^3.6.0` em `package.json` via `<lov-add-dependency>` para que o lockfile seja regenerado de fato.
- Sem isso, nada renderiza.

### Etapa 2 — Correções de UI (escopo focado e seguro)

Mantendo Shadcn flat, fundo branco, sem sombras. Mudanças cirúrgicas, sem refatoração de layout.

**A. `src/pages/PublicProjectRequest.tsx`** (página pública, viewport atual do usuário em 360px)

1. Logo Oras (`/logo-oras.svg`) centralizada acima do card, padrão das telas públicas (Login/ResetPassword).
2. Título `text-xl font-semibold` → `text-2xl font-bold` + subtítulo `text-sm text-muted-foreground`.
3. Card com padding responsivo: `p-6` → `p-4 sm:p-6`.
4. Botões "Continuar" e "Enviar solicitação": adicionar `w-full sm:w-auto`.
5. Header do bloco "Tarefas do projeto": `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`; botão "Nova tarefa" com `w-full sm:w-auto`.
6. Prazo da tarefa expandida: formatar com `format(new Date(task.dueDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })` em vez de ISO cru.
7. Input "Prazo desejado" do projeto: adicionar `min={minDate}`.
8. `<DialogContent>` do modal "Nova tarefa": `className="max-w-[95vw] sm:max-w-lg"`.
9. Tela "done": adicionar botão "Enviar nova solicitação" que reseta `title`, `briefing`, `deadline`, `requestedTasks`, `expandedTasks`, `publicAttachments` e volta para `step="form"`.
10. Tela "Link indisponível": adicionar logo Oras acima do card.
11. Inputs de contato: `autoComplete="name"` e `autoComplete="email"`.

**B. `src/components/client/ProjectRequestForm.tsx`** (mesmo formulário no fluxo autenticado — manter paridade)

1. Header do bloco "Tarefas do projeto": aplicar mesmo `flex-col sm:flex-row` se ainda não tiver.
2. Modal de nova tarefa: garantir `max-w-[95vw] sm:max-w-lg` no `DialogContent`.
3. Botão "Nova tarefa" com `w-full sm:w-auto` no mobile.

(Verifico antes de tocar — se já estiver no padrão, pulo.)

### Fora de escopo (intencionalmente)

- Edge functions, RPCs, lógica de submit, RLS — tudo funcionando, sem mudanças.
- Outras páginas — não há reclamação concreta nem evidência de bug visual; mexer agora é risco sem ganho.
- Refatoração de componentes — mantido o estilo atual conforme pedido.

### Verificação

1. Build compila sem erros TS2307.
2. `/request/:token` em 360px: logo aparece, card respira, botões ocupam largura total, modal de tarefa não encosta nas bordas.
3. Adicionar tarefa com prazo `2026-04-25` → card expandido mostra `25/04/2026`.
4. Tentar prazo no passado em "Prazo desejado" → navegador bloqueia.
5. Enviar → tela "done" tem botão "Enviar nova solicitação" funcional.
6. Token inválido → tela "Link indisponível" com logo.
7. Fluxo autenticado de solicitação de projeto continua idêntico em desktop, melhor em mobile.

### Arquivos editados

- `package.json` (regenerar lockfile com `date-fns`)
- `src/pages/PublicProjectRequest.tsx`
- `src/components/client/ProjectRequestForm.tsx` (apenas se faltar paridade)


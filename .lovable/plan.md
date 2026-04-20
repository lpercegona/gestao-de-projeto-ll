## Solicitações públicas e log de solicitações

Adicionar uma área de **Solicitações** nas Configurações (apenas admin), que permita:

1. Ativar um link público para solicitação de novos projetos (com validação de e-mail).
2. Visualizar log completo de todas as solicitações recebidas.

### 1. Banco de Dados (migrações)

**Tabela `request_link_settings**` (1 linha por admin):

- `owner_id` (uuid, único) — admin dono
- `is_enabled` (bool, default false) — liga/desliga o link
- `share_token` (text, único, default uuid) — slug do link público

**Adicionar colunas em `project_requests`:**

- `source` text default `'authenticated'` — `'authenticated'` ou `'public_link'`
- `requester_email` text — e-mail do solicitante (sempre preenchido)
- `requester_name` text — nome digitado/perfil
- `requester_ip` text — IP capturado da edge function

**RPC `get_public_request_link(p_token)**` (security definer): retorna `{ owner_id, is_enabled }` quando válido — usada na página pública.

**RPC `validate_request_email(p_token, p_email)**` (security definer): verifica se o e-mail existe em `clients.email` (do owner desse token) ou em `client_users` (via auth.users join). Retorna `{ client_id, client_name }` ou null. Bloqueia acesso se não vinculado.

**Edge function `submit-public-project-request**`: recebe `{ token, email, name, title, briefing, desired_deadline, requested_tasks, custom_fields }`, captura IP via header, valida e-mail vinculado, insere em `project_requests` com `source='public_link'`, `requester_ip`, `requester_email`. Não exige autenticação (`verify_jwt = false`).

**RLS:** admin pode ler/escrever próprio `request_link_settings`; project_requests permanece com policies atuais (insert via edge function usa service role).

### 2. Configurações (admin) — nova aba "Solicitações"

`**SettingsDialog.tsx**`: adicionar item `{ id: "requests", label: "Solicitações", icon: Inbox, adminOnly: true }`.

**Novo componente `RequestsSettingsTab.tsx**` com 2 sub-seções:

**A) Link público de solicitação**

- Toggle: "Ativar link público de solicitação de projeto"
- Quando ativo: mostra URL `https://app.../request/<token>`, botão Copiar, botão Regenerar token
- Aviso: "O solicitante precisará informar um e-mail vinculado a um cliente cadastrado para acessar o formulário."

**B) Log de solicitações** — tabela com colunas:
| Título | Data | Solicitante (nome + e-mail) | Origem (badge "Link público" / "Logado") | IP |

Lê `project_requests` do owner (admin) ordenado por `created_at desc`. Suporta busca/filtro simples por título.

### 3. Página pública `/request/:token`

**Novo `src/pages/PublicProjectRequest.tsx**` + rota em `App.tsx`:

Fluxo em 2 etapas:

1. **Validação de e-mail** — Input de e-mail + nome → chama RPC `validate_request_email`. Se inválido: erro "E-mail não vinculado a nenhum cliente cadastrado." e bloqueia. Se válido: avança.
2. **Formulário** — Reusa o JSX do `ProjectRequestForm` (extraído para componente compartilhado de campos), submetendo via edge function `submit-public-project-request`.

Layout simples (sem AppLayout, sem auth) com logo do admin (via owner_id → profile).

### 4. Solicitação autenticada — registro adicional

`ClientProjects.tsx`, `CalendarPage.tsx`, `QuickRequestCard.tsx`, `Projects.tsx` (qualquer insert em `project_requests`): popular também `requester_email` (do `user.email`), `requester_name` (do profile), `source='authenticated'`. IP fica null para autenticados (registrado em log como "Logado").

### 5. Identificação na listagem de Projetos

Em `Projects.tsx` (`visibleRequestProjects`):

- Quando `request.source === 'public_link'`: `request_label = 'Solicitação (link público) — ' + requester_name`
- Quando autenticada: `request_label = 'Solicitação — ' + requester_name`

Badge em `ProjectListView.tsx` e `ProjectTableView.tsx` já renderiza `request_label`, então só precisa do texto correto.

### Arquivos editados/criados

**Criar:**

- `supabase/migrations/<timestamp>_request_link_settings.sql`
- `supabase/functions/submit-public-project-request/index.ts`
- `src/components/settings/RequestsSettingsTab.tsx`
- `src/pages/PublicProjectRequest.tsx`

**Editar:**

- `src/components/settings/SettingsDialog.tsx` — adicionar nav item + render
- `src/App.tsx` — adicionar rota `/request/:token`
- `src/pages/Projects.tsx` — usar `requester_name` e `source` no `request_label`
- `src/pages/ClientProjects.tsx`, `src/pages/CalendarPage.tsx`, `src/components/dashboard/QuickRequestCard.tsx` — popular `requester_email/name/source` no insert

### Verificação após implementação

1. Como admin, abrir Configurações → Solicitações → ativar link público → copiar URL.
2. Acessar URL em janela anônima, tentar e-mail aleatório → bloqueado.
3. Usar e-mail de cliente real → formulário abre, enviar.
4. Verificar listagem em `/projects` mostra badge "Solicitação (link público) — Nome".
5. Voltar em Configurações → Solicitações → log mostra a entrada com IP e origem "Link público".
6. Como cliente logado, criar solicitação → log mostra origem "Logado", IP inclue ip em log.
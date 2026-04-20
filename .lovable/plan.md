## Anexos de imagens em solicitações de projeto

Adicionar upload de imagens aos formulários de solicitação, exibir nos detalhes e disponibilizar em uma pasta "Solicitações" dentro de "Arquivos" do cliente.

### 1. Banco de dados (migração)

**Adicionar coluna em `project_requests`:**

- `attachments` jsonb default `'[]'` — array de `{ name, url, uploaded_at }`

**Novo bucket público `request-attachments**` (insert em `storage.buckets`), com políticas RLS em `storage.objects`:

- Leitura pública (bucket é public)
- Admin pode gerenciar objetos cuja primeira pasta do path seja de clients do seu `owner_id`
- Cliente autenticado pode inserir objetos em pastas onde a primeira pasta corresponda ao seu próprio `client_id` (via `get_user_client_id`)
- Submissão pública via edge function usa service role (bypass)

Estrutura de pastas: `<client_id>/<request_id ou uuid temporário>/<timestamp>-<nome>.ext`.

### 2. Formulários de solicitação — botão "Anexar imagens"

Editar `**src/components/client/ProjectRequestForm.tsx**`:

- Nova seção "Imagens de apoio (opcional)" com botão `Anexar imagens` (input file accept=`image/*` multiple, limite sugerido 10 arquivos / 2MB cada).
- Upload imediato para `request-attachments/<client_id>/tmp-<uuid>/…` (resolve `client_id` do mesmo jeito que o form já faz para `project_columns`).
- Preview em grid (thumbnails 80x80) com botão remover (deleta do storage).
- Ao submeter, passar `attachments: [{ name, url, uploaded_at }]` no callback `onSubmit`.
- Ampliar assinatura `onSubmit` para incluir `attachments`.

Atualizar os 3 callers autenticados para gravar em `project_requests.attachments`:

- `src/pages/ClientProjects.tsx` — `handleSubmitRequest`
- `src/components/dashboard/QuickRequestCard.tsx` — `handleSubmitRequest`
- `src/pages/CalendarPage.tsx` — `handleSubmitRequest`

### 3. Fluxo público (`/request/:token`)

Editar `**src/pages/PublicProjectRequest.tsx**`:

- Mesma UI de upload. Como não autenticado, enviar arquivos como base64 (ou multipart) no corpo para a edge function.
- Limite reduzido: 10 arquivos, 2MB cada (validado no cliente e na função).

Editar `**supabase/functions/submit-public-project-request/index.ts**`:

- Aceitar `attachments: Array<{ name: string, contentBase64: string, mime: string }>` no payload (zod).
- Após inserir o `project_request`, usar service role para fazer upload em `request-attachments/<client_id>/<request_id>/…`, coletar URLs públicas e gravar em `project_requests.attachments`.

### 4. Exibição nas solicitações/detalhes

Editar `**src/components/projects/ProjectDetailDialogContent.tsx**`:

- Quando `project.is_request === true` e houver anexos (novo campo `project.request_attachments`), renderizar bloco "Imagens" com grid de thumbnails clicáveis (abre em nova aba).

Propagar `request_attachments` no shape `UnifiedProject`:

- `src/pages/Projects.tsx` — no `SELECT` de `project_requests` incluir `attachments`; mapear para `request_attachments` no item unificado.
- `src/pages/ClientProjects.tsx` — idem.
- `src/components/projects/ProjectDetailSheet.tsx` e tipos `Project` correlatos — aceitar `request_attachments?: Array<{name,url,uploaded_at}>`.

Ao **converter solicitação em projeto** (`Projects.tsx` `handleQuickApproveRequest`), anexar as imagens à descrição do projeto criado preservando links (append de um bloco HTML `<p>Imagens:</p><ul><li><a href="...">nome</a></li>…</ul>`) OU salvar em novo campo `projects.attachments` — escolher o append no `description` para evitar migração adicional.

### 5. Pasta "Solicitações" em Arquivos do cliente

Editar `**src/components/clients/ProposalsTab.tsx**`:

- Adicionar nova pasta fixa `requests` (label: "Solicitações") no `rootItems`.
- Nova prop/hook que recebe `clientId` (componente hoje não recebe — passar via `Clients.tsx` ou carregar do contexto). Ajustar `ProposalsTab` para aceitar `clientId?: string` opcional.
- Carregar `project_requests` do cliente filtrando por `client_id` e expandir `attachments` em itens de lista (um item por imagem, exibindo nome do arquivo, data e link "Abrir").
- Breadcrumbs: `['Arquivos', 'Solicitações']`.
- Agrupamento visual: sub-accordion por título da solicitação OU lista linear com coluna "Solicitação de origem" — usar lista linear com coluna de origem para manter o padrão atual da tabela.

A pasta aparece em todos os clientes (vazia quando não há solicitações com anexos).

### 6. Verificação

1. Como cliente logado, criar solicitação com 2 imagens → ver preview, enviar.
2. Abrir painel admin → Projetos → card de solicitação → detalhes mostram as imagens.
3. Admin vai em Clientes → cliente X → aba Arquivos → pasta "Solicitações" lista os 3 anexos.
4. Aprovar solicitação → projeto convertido mantém os links na descrição.
5. Abrir link público `/request/:token` em janela anônima, anexar imagens, enviar → aparece igual no admin.
6. Testar limites (arquivo > 2MB, > 10 arquivos) exibe erro no formulário.

### Arquivos criados/editados

**Criar:**

- `supabase/migrations/<timestamp>_request_attachments.sql` (coluna + bucket + policies)

**Editar:**

- `src/components/client/ProjectRequestForm.tsx`
- `src/pages/PublicProjectRequest.tsx`
- `supabase/functions/submit-public-project-request/index.ts`
- `src/pages/ClientProjects.tsx`
- `src/components/dashboard/QuickRequestCard.tsx`
- `src/pages/CalendarPage.tsx`
- `src/pages/Projects.tsx`
- `src/components/projects/ProjectDetailDialogContent.tsx`
- `src/components/projects/ProjectDetailSheet.tsx` (tipo)
- `src/components/clients/ProposalsTab.tsx`
- `src/pages/Clients.tsx` (passar `clientId` quando selecionado, se aplicável — ou ajustar carregamento global)
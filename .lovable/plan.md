## Anexos em projetos criados por admins

Hoje só **solicitações de projeto** (`project_requests`) suportam imagens de apoio via `RequestAttachmentsUploader` + bucket `request-attachments`. Quando o admin cria/edita um projeto direto pelo formulário de "Novo Projeto" não há essa opção. Vou trazer paridade.

### Mudanças

**1. Banco de dados (migração)**
- Adicionar coluna `attachments jsonb NOT NULL DEFAULT '[]'::jsonb` em `public.projects`.
- Mesmo formato já usado em `project_requests.attachments` e `RequestAttachment` no front: `{ name, url, uploaded_at, path }`.
- Sem mudança em RLS — políticas existentes já cobrem leitura/escrita por admins/colaboradores/clientes via `owner_id`/`user_project_access`.

**2. Storage**
- Reutilizar bucket público existente `request-attachments` (mesma estrutura `<clientId>/<folder>/<file>`). Evita criar bucket novo e mantém consistência com anexos de solicitações.
- Limites: até 10 imagens, 2 MB cada (igual ao uploader atual).

**3. UI — `src/pages/Projects.tsx`**
- Estender `formData` com `attachments: RequestAttachment[]`.
- No `FormSheet` de Novo/Editar Projeto (linhas ~1589–1670), adicionar bloco com `<RequestAttachmentsUploader>` logo abaixo do prazo, condicional a `formData.client_id` estar preenchido (uploader exige `clientId`).
- Em editar: pré-popular com `editingProject.attachments`.
- Em `handleSubmit`: enviar `attachments` no payload de `createProject`/`updateProject`.
- Resetar `attachments` ao fechar/limpar o formulário.

**4. DataContext**
- `createProject` / `updateProject` já fazem spread do payload. Ajustar tipagens locais (`Project`) em `src/types/index.ts` e nas interfaces internas para incluir `attachments?: RequestAttachment[]` e fazer o cast `as unknown as Json` na escrita (padrão do projeto).

**5. Visualização**
- Em `ProjectDetailDialogContent.tsx`, generalizar o bloco "Imagens de apoio": além do caso `project.is_request`, mostrar também quando `project.attachments?.length > 0`. Mesma grade de thumbs com link para abrir em nova aba.

**6. Limpeza ao excluir projeto (best-effort)**
- Em `deleteProject`, antes do delete no banco, tentar `supabase.storage.from('request-attachments').remove(paths)` para os anexos do projeto. Falhas são silenciosas (toast só no erro do delete principal).

### Não incluso
- Não vou tocar no fluxo de cliente (`ClientProjects.tsx`) — o pedido foi explicitamente para admins. Posso estender depois se quiser.
- Não vou suportar arquivos não-imagem agora (mantendo paridade com `RequestAttachmentsUploader`).

### Arquivos editados
- `supabase` migração: `ALTER TABLE projects ADD COLUMN attachments`
- `src/pages/Projects.tsx`
- `src/components/projects/ProjectDetailDialogContent.tsx`
- `src/types/index.ts`
- `src/contexts/DataContext.tsx` (ajuste de tipo + delete cleanup)

### QA manual
1. Admin cria novo projeto, anexa 2 imagens, salva → reabre projeto e vê thumbnails.
2. Edita projeto, remove 1 imagem, adiciona outra, salva → estado persistido.
3. Tentar anexar antes de selecionar cliente → botão desabilitado (uploader já trata).
4. Excluir projeto com anexos → registros e arquivos do storage removidos.
5. Cliente/colaborador acessa o projeto → vê os anexos somente leitura.

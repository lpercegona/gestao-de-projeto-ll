

## Adicionar tarefas ao formulário público de solicitação

Replicar o bloco "Tarefas do projeto" (já existente no fluxo autenticado em `ProjectRequestForm.tsx`) na página pública `/request/:token`.

### Mudanças em `src/pages/PublicProjectRequest.tsx`

**Novo estado:**
- `requestedTasks: { title: string; description: string; dueDate: string }[]`
- `taskModalOpen: boolean`
- `expandedTasks: number[]`
- `taskForm: { title, description, dueDate }`

**Nova UI** (entre "Prazo desejado" e "Imagens de apoio"):
- Bloco "Tarefas do projeto (opcional)" com header e botão "Nova tarefa" (ícone `Plus`).
- Lista de tarefas adicionadas:
  - Linha clicável que expande/colapsa (`ChevronDown`/`ChevronUp`).
  - Botão remover (`Trash2`).
  - Quando expandida: mostra Descrição e Prazo formatado.
- Mensagem "Nenhuma tarefa adicionada ainda" quando vazio.

**Novo `Dialog` "Nova tarefa":**
- Usa `Dialog` do shadcn (já que a página pública não usa `FormSheet`/AppLayout).
- Campos: Título (obrigatório), Descrição (Textarea), Prazo (Input date com `min` = amanhã).
- Botões: Cancelar / Adicionar tarefa.
- Ao adicionar: faz push em `requestedTasks`, fecha modal e reseta `taskForm`.

**Atualização do submit:**
- Incluir `requested_tasks: requestedTasks.length > 0 ? requestedTasks : undefined` no body do `submit-public-project-request`.

### Backend e admin — sem mudanças

- A edge function `submit-public-project-request` já valida e persiste `requested_tasks` (campo `TaskSchema` no zod já existe).
- A coluna `project_requests.requested_tasks` (jsonb) já existe.
- A exibição em `Projects.tsx` / `ProjectDetailDialogContent.tsx` e a conversão em projeto/tarefas já funcionam para solicitações públicas (mesma origem de dados das autenticadas).

### Verificação

1. Abrir `/request/:token` em janela anônima → validar e-mail.
2. Adicionar 2 tarefas (uma com prazo, uma sem), expandir/colapsar, remover uma.
3. Anexar imagens, enviar → ver tela "Solicitação enviada".
4. Como admin: abrir o card da solicitação em Projetos → confirmar tarefas listadas no bloco existente.
5. Aprovar a solicitação → tarefas devem ser criadas no projeto convertido.

### Arquivo editado

- `src/pages/PublicProjectRequest.tsx` (única alteração)


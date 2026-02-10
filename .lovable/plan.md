
# Plano: Ativar Notificações para Administradores

## Visão Geral
Ativar o sistema de notificações para administradores, cobrindo:
- Solicitações de novos projetos de clientes
- Solicitações de edição de clientes (projetos e tarefas)
- Registro de horas por colaboradores

O sistema já possui a infraestrutura de notificações (tabela, realtime, componentes), mas os triggers no banco de dados não foram aplicados corretamente.

---

## Etapa 1: Corrigir Erros de Build Existentes

### 1.1 SolicitacoesPanel.tsx
- Linha 119: Alterar `variant="outlined"` para `variant="outline"`

### 1.2 Projects.tsx
- Linha 474: Adicionar verificação de tipo para acessar `pending_request_id`
- Linha 964: Ajustar tipo passado para o componente `ProjectListView`

---

## Etapa 2: Criar Triggers de Notificação no Banco de Dados

### 2.1 Trigger para Solicitações de Novos Projetos
Quando um cliente cria uma solicitação de novo projeto, notificar o administrador responsável (baseado em `client.owner_id`).

```text
Evento: INSERT em project_requests
Destinatário: owner_id do cliente
Tipo: client_project_request_created
```

### 2.2 Trigger para Solicitações de Edição
Quando um cliente solicita edição em projeto ou solicitação, notificar o administrador. Distinguir entre:
- Edição de projeto/solicitação
- Solicitação de nova tarefa

```text
Evento: INSERT em edit_requests
Destinatário: owner_id do cliente
Tipos: 
  - client_edit_request_created
  - client_task_request_created
```

### 2.3 Trigger para Registro de Horas por Colaboradores
Quando um colaborador registra horas, notificar o administrador responsável pelo cliente do projeto.

```text
Evento: INSERT em time_entries
Destinatário: owner_id do cliente (via project -> client)
Tipo: collaborator_time_entry_created
```

---

## Etapa 3: Atualizar Ícones nas Notificações

### NotificationItem.tsx
Adicionar ícones para os novos tipos:
- `client_project_request_created` - ícone de solicitação
- `client_edit_request_created` - ícone de edição
- `client_task_request_created` - ícone de tarefa
- `collaborator_time_entry_created` - ícone de tempo

---

## Detalhes Técnicos

### Migração SQL

```sql
-- Função: Notificar admin sobre nova solicitação de projeto
CREATE OR REPLACE FUNCTION public.notify_admin_project_request_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public' AS $$
DECLARE
  v_admin_user_id UUID;
  v_client_name TEXT;
  v_requester_name TEXT;
BEGIN
  SELECT c.owner_id, c.name INTO v_admin_user_id, v_client_name
  FROM clients c WHERE c.id = NEW.client_id;

  IF v_admin_user_id IS NULL OR v_admin_user_id = NEW.created_by THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(pr.full_name, pr.email, 'Cliente') INTO v_requester_name
  FROM profiles pr WHERE pr.user_id = NEW.created_by;

  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    v_admin_user_id,
    'client_project_request_created',
    'Nova solicitação de projeto',
    v_requester_name || ' solicitou novo projeto: "' || NEW.title || '".'
  );
  RETURN NEW;
END; $$;

-- Trigger
CREATE TRIGGER on_project_request_created_notify_admin
  AFTER INSERT ON project_requests
  FOR EACH ROW EXECUTE FUNCTION notify_admin_project_request_created();

-- Função: Notificar admin sobre solicitação de edição
CREATE OR REPLACE FUNCTION public.notify_admin_edit_request_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public' AS $$
DECLARE
  v_admin_user_id UUID;
  v_client_name TEXT;
  v_requester_name TEXT;
  v_project_id UUID;
  v_request_type TEXT;
  v_notif_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  SELECT c.owner_id, c.name INTO v_admin_user_id, v_client_name
  FROM clients c WHERE c.id = NEW.client_id;

  IF v_admin_user_id IS NULL OR v_admin_user_id = NEW.requested_by THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(pr.full_name, pr.email, 'Cliente') INTO v_requester_name
  FROM profiles pr WHERE pr.user_id = NEW.requested_by;

  v_project_id := CASE WHEN NEW.entity_type = 'project' THEN NEW.entity_id::uuid ELSE NULL END;
  v_request_type := COALESCE(NEW.proposed_data->>'request_type', 'edit');

  IF v_request_type = 'new_task' THEN
    v_notif_type := 'client_task_request_created';
    v_title := 'Nova solicitação de tarefa';
    v_message := v_requester_name || ' solicitou nova tarefa para "' || v_client_name || '".';
  ELSE
    v_notif_type := 'client_edit_request_created';
    v_title := 'Nova solicitação de edição';
    v_message := v_requester_name || ' solicitou edição para "' || v_client_name || '".';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, project_id)
  VALUES (v_admin_user_id, v_notif_type, v_title, v_message, v_project_id);
  RETURN NEW;
END; $$;

-- Trigger
CREATE TRIGGER on_edit_request_created_notify_admin
  AFTER INSERT ON edit_requests
  FOR EACH ROW EXECUTE FUNCTION notify_admin_edit_request_created();

-- Função: Notificar admin sobre registro de horas de colaborador
CREATE OR REPLACE FUNCTION public.notify_admin_new_time_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public' AS $$
DECLARE
  v_admin_user_id UUID;
  v_project_id UUID;
  v_project_name TEXT;
  v_task_name TEXT;
  v_collab_name TEXT;
BEGIN
  SELECT p.id, p.name, t.name, c.owner_id
  INTO v_project_id, v_project_name, v_task_name, v_admin_user_id
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  WHERE t.id = NEW.task_id;

  IF v_admin_user_id IS NULL OR v_admin_user_id = NEW.created_by THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(pr.full_name, pr.email, 'Colaborador') INTO v_collab_name
  FROM profiles pr WHERE pr.user_id = NEW.created_by;

  INSERT INTO notifications (user_id, type, title, message, project_id)
  VALUES (
    v_admin_user_id,
    'collaborator_time_entry_created',
    'Horas registradas',
    v_collab_name || ' registrou ' || NEW.hours || 'h em "' || v_task_name || '".',
    v_project_id
  );
  RETURN NEW;
END; $$;

-- Trigger
CREATE TRIGGER on_time_entry_created_notify_admin
  AFTER INSERT ON time_entries
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_time_entry();
```

### Alterações em NotificationItem.tsx

Adicionar casos no switch de ícones:
- `client_project_request_created` → FileText (laranja)
- `client_edit_request_created` → FilePenLine (azul)
- `client_task_request_created` → ListPlus (verde)
- `collaborator_time_entry_created` → Clock (roxo)

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Criar 3 funções e 3 triggers |
| `SolicitacoesPanel.tsx` | Corrigir variante do Badge |
| `Projects.tsx` | Ajustar tipos TypeScript |
| `NotificationItem.tsx` | Adicionar ícones para novos tipos |

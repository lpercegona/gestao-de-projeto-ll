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
    COALESCE(v_requester_name, 'Cliente') || ' solicitou novo projeto: "' || NEW.title || '".'
  );
  RETURN NEW;
END; $$;

-- Trigger para solicitações de novos projetos
DROP TRIGGER IF EXISTS on_project_request_created_notify_admin ON project_requests;
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
    v_message := COALESCE(v_requester_name, 'Cliente') || ' solicitou nova tarefa para "' || v_client_name || '".';
  ELSE
    v_notif_type := 'client_edit_request_created';
    v_title := 'Nova solicitação de edição';
    v_message := COALESCE(v_requester_name, 'Cliente') || ' solicitou edição para "' || v_client_name || '".';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, project_id)
  VALUES (v_admin_user_id, v_notif_type, v_title, v_message, v_project_id);
  RETURN NEW;
END; $$;

-- Trigger para solicitações de edição
DROP TRIGGER IF EXISTS on_edit_request_created_notify_admin ON edit_requests;
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
    COALESCE(v_collab_name, 'Colaborador') || ' registrou ' || NEW.hours || 'h em "' || v_task_name || '".',
    v_project_id
  );
  RETURN NEW;
END; $$;

-- Trigger para registro de horas
DROP TRIGGER IF EXISTS on_time_entry_created_notify_admin ON time_entries;
CREATE TRIGGER on_time_entry_created_notify_admin
  AFTER INSERT ON time_entries
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_time_entry();
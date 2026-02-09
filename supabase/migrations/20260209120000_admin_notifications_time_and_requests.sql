-- Notifica administradores sobre novas horas de colaboradores
-- e solicitações de clientes (novo projeto/edição)

CREATE OR REPLACE FUNCTION public.notify_admin_new_time_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_user_id UUID;
  v_project_id UUID;
  v_project_name TEXT;
  v_task_name TEXT;
  v_collaborator_name TEXT;
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

  SELECT COALESCE(pr.full_name, pr.email, 'Colaborador')
  INTO v_collaborator_name
  FROM profiles pr
  WHERE pr.user_id = NEW.created_by;

  INSERT INTO public.notifications (user_id, type, title, message, project_id)
  VALUES (
    v_admin_user_id,
    'collaborator_time_entry_created',
    'Nova atividade de horas registrada',
    COALESCE(v_collaborator_name, 'Um colaborador') || ' registrou ' || NEW.hours || 'h na tarefa "' || v_task_name || '" do projeto "' || v_project_name || '".',
    v_project_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_time_entry_created_notify_admin ON public.time_entries;
CREATE TRIGGER on_time_entry_created_notify_admin
  AFTER INSERT ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_time_entry();


CREATE OR REPLACE FUNCTION public.notify_admin_project_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_user_id UUID;
  v_client_name TEXT;
  v_client_user_name TEXT;
BEGIN
  SELECT c.owner_id, c.name
  INTO v_admin_user_id, v_client_name
  FROM clients c
  WHERE c.id = NEW.client_id;

  IF v_admin_user_id IS NULL OR v_admin_user_id = NEW.created_by THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(pr.full_name, pr.email, 'Cliente')
  INTO v_client_user_name
  FROM profiles pr
  WHERE pr.user_id = NEW.created_by;

  INSERT INTO public.notifications (user_id, type, title, message, project_id)
  VALUES (
    v_admin_user_id,
    'client_project_request_created',
    'Nova solicitação de projeto',
    COALESCE(v_client_user_name, 'Um cliente') || ' solicitou um novo projeto para "' || v_client_name || '": "' || NEW.title || '".',
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_request_created_notify_admin ON public.project_requests;
CREATE TRIGGER on_project_request_created_notify_admin
  AFTER INSERT ON public.project_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_project_request_created();


CREATE OR REPLACE FUNCTION public.notify_admin_edit_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_user_id UUID;
  v_client_name TEXT;
  v_client_user_name TEXT;
  v_project_id UUID;
BEGIN
  SELECT c.owner_id, c.name
  INTO v_admin_user_id, v_client_name
  FROM clients c
  WHERE c.id = NEW.client_id;

  IF v_admin_user_id IS NULL OR v_admin_user_id = NEW.requested_by THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(pr.full_name, pr.email, 'Cliente')
  INTO v_client_user_name
  FROM profiles pr
  WHERE pr.user_id = NEW.requested_by;

  IF NEW.entity_type = 'project' THEN
    v_project_id := NEW.entity_id;
  ELSE
    v_project_id := NULL;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, project_id)
  VALUES (
    v_admin_user_id,
    'client_edit_request_created',
    'Nova solicitação de edição',
    COALESCE(v_client_user_name, 'Um cliente') || ' solicitou uma edição para "' || v_client_name || '".',
    v_project_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_edit_request_created_notify_admin ON public.edit_requests;
CREATE TRIGGER on_edit_request_created_notify_admin
  AFTER INSERT ON public.edit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_edit_request_created();

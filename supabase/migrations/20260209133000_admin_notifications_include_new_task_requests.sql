-- Complementa notificações de admin para distinguir solicitação de nova tarefa

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
  v_request_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
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

  v_request_type := COALESCE(NEW.proposed_data->>'request_type', 'edit_project');

  IF v_request_type = 'new_task' THEN
    v_type := 'client_task_request_created';
    v_title := 'Nova solicitação de tarefa';
    v_message := COALESCE(v_client_user_name, 'Um cliente') || ' solicitou uma nova tarefa para "' || v_client_name || '".';
  ELSE
    v_type := 'client_edit_request_created';
    v_title := 'Nova solicitação de edição';
    v_message := COALESCE(v_client_user_name, 'Um cliente') || ' solicitou uma edição para "' || v_client_name || '".';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, project_id)
  VALUES (
    v_admin_user_id,
    v_type,
    v_title,
    v_message,
    v_project_id
  );

  RETURN NEW;
END;
$$;

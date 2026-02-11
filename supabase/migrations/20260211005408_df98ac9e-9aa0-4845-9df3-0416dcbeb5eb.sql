
-- Add auth.uid() validation to notify_project_changes and notify_task_changes

CREATE OR REPLACE FUNCTION public.notify_project_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_user_id UUID;
  v_project_name TEXT;
  v_client_name TEXT;
  v_client_user_id UUID;
  v_calling_user UUID := auth.uid();
BEGIN
  -- Validate calling context
  IF v_calling_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT p.name, c.name, c.user_id INTO v_project_name, v_client_name, v_client_user_id
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  WHERE p.id = COALESCE(NEW.id, OLD.id);

  FOR v_user_id IN 
    SELECT upa.user_id FROM user_project_access upa
    WHERE upa.project_id = COALESCE(NEW.id, OLD.id)
    AND upa.user_id != v_calling_user
  LOOP
    INSERT INTO notifications (user_id, type, title, message, project_id)
    VALUES (
      v_user_id,
      CASE TG_OP
        WHEN 'INSERT' THEN 'project_created'
        WHEN 'UPDATE' THEN 'project_updated'
        ELSE 'project_deleted'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'Novo projeto atribuído'
        WHEN 'UPDATE' THEN 'Projeto atualizado'
        ELSE 'Projeto removido'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'Você foi atribuído ao projeto "' || v_project_name || '" do cliente ' || v_client_name
        WHEN 'UPDATE' THEN 'O projeto "' || v_project_name || '" foi atualizado'
        ELSE 'O projeto foi removido'
      END,
      COALESCE(NEW.id, OLD.id)
    );
  END LOOP;

  IF TG_OP IN ('INSERT', 'UPDATE') AND v_client_user_id IS NOT NULL AND v_client_user_id != v_calling_user THEN
    INSERT INTO notifications (user_id, type, title, message, project_id)
    VALUES (
      v_client_user_id,
      CASE TG_OP
        WHEN 'INSERT' THEN 'project_created'
        ELSE 'project_updated'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'Novo projeto criado'
        ELSE 'Projeto atualizado'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'Um novo projeto "' || v_project_name || '" foi criado para você'
        ELSE 'O projeto "' || v_project_name || '" foi atualizado'
      END,
      NEW.id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

---

CREATE OR REPLACE FUNCTION public.notify_task_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_user_id UUID;
  v_task_name TEXT;
  v_project_name TEXT;
  v_project_id UUID;
  v_client_user_id UUID;
  v_calling_user UUID := auth.uid();
BEGIN
  -- Validate calling context
  IF v_calling_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT t.name, p.name, p.id, c.user_id 
  INTO v_task_name, v_project_name, v_project_id, v_client_user_id
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  WHERE t.id = COALESCE(NEW.id, OLD.id);

  FOR v_user_id IN 
    SELECT upa.user_id FROM user_project_access upa
    WHERE upa.project_id = v_project_id
    AND upa.user_id != v_calling_user
  LOOP
    INSERT INTO notifications (user_id, type, title, message, project_id)
    VALUES (
      v_user_id,
      CASE TG_OP
        WHEN 'INSERT' THEN 'task_created'
        WHEN 'UPDATE' THEN 'task_updated'
        ELSE 'task_deleted'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'Nova tarefa criada'
        WHEN 'UPDATE' THEN 
          CASE 
            WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 'Tarefa concluída'
            ELSE 'Tarefa atualizada'
          END
        ELSE 'Tarefa removida'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'A tarefa "' || v_task_name || '" foi criada no projeto "' || v_project_name || '"'
        WHEN 'UPDATE' THEN 
          CASE 
            WHEN NEW.status = 'completed' AND OLD.status != 'completed' 
            THEN 'A tarefa "' || v_task_name || '" foi concluída no projeto "' || v_project_name || '"'
            ELSE 'A tarefa "' || v_task_name || '" foi atualizada no projeto "' || v_project_name || '"'
          END
        ELSE 'A tarefa "' || v_task_name || '" foi removida do projeto "' || v_project_name || '"'
      END,
      v_project_id
    );
  END LOOP;

  IF v_client_user_id IS NOT NULL AND v_client_user_id != v_calling_user THEN
    INSERT INTO notifications (user_id, type, title, message, project_id)
    VALUES (
      v_client_user_id,
      CASE TG_OP
        WHEN 'INSERT' THEN 'task_created'
        WHEN 'UPDATE' THEN 'task_updated'
        ELSE 'task_deleted'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'Nova tarefa criada'
        WHEN 'UPDATE' THEN 
          CASE 
            WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 'Tarefa concluída'
            ELSE 'Tarefa atualizada'
          END
        ELSE 'Tarefa removida'
      END,
      CASE TG_OP
        WHEN 'INSERT' THEN 'A tarefa "' || v_task_name || '" foi criada no projeto "' || v_project_name || '"'
        WHEN 'UPDATE' THEN 
          CASE 
            WHEN NEW.status = 'completed' AND OLD.status != 'completed' 
            THEN 'A tarefa "' || v_task_name || '" foi concluída no projeto "' || v_project_name || '"'
            ELSE 'A tarefa "' || v_task_name || '" foi atualizada no projeto "' || v_project_name || '"'
          END
        ELSE 'A tarefa "' || v_task_name || '" foi removida do projeto "' || v_project_name || '"'
      END,
      v_project_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

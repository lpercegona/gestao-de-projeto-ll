-- =============================================
-- 1. TABELA DE NOTIFICAÇÕES
-- =============================================

-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias notificações
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Sistema pode inserir notificações (via triggers/functions)
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Usuários podem deletar suas próprias notificações
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Habilitar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- 2. FUNÇÃO PARA NOTIFICAR ALTERAÇÕES EM PROJETOS
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_project_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_project_name TEXT;
  v_client_name TEXT;
  v_client_user_id UUID;
BEGIN
  -- Get project and client info
  SELECT p.name, c.name, c.user_id INTO v_project_name, v_client_name, v_client_user_id
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  WHERE p.id = COALESCE(NEW.id, OLD.id);

  -- Notify all collaborators with access to this project
  FOR v_user_id IN 
    SELECT upa.user_id FROM user_project_access upa
    WHERE upa.project_id = COALESCE(NEW.id, OLD.id)
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

  -- Notify client if they have a user account
  IF TG_OP IN ('INSERT', 'UPDATE') AND v_client_user_id IS NOT NULL THEN
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

-- Trigger para projetos
CREATE TRIGGER on_project_change
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_changes();

-- =============================================
-- 3. FUNÇÃO PARA NOTIFICAR ALTERAÇÕES EM TAREFAS
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_task_name TEXT;
  v_project_name TEXT;
  v_project_id UUID;
  v_client_user_id UUID;
BEGIN
  -- Get task and project info
  SELECT t.name, p.name, p.id, c.user_id 
  INTO v_task_name, v_project_name, v_project_id, v_client_user_id
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  WHERE t.id = COALESCE(NEW.id, OLD.id);

  -- Notify all collaborators with access to this project
  FOR v_user_id IN 
    SELECT upa.user_id FROM user_project_access upa
    WHERE upa.project_id = v_project_id
    AND upa.user_id != COALESCE(NEW.created_by, OLD.created_by)
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

  -- Notify client if they have a user account
  IF v_client_user_id IS NOT NULL THEN
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

-- Trigger para tarefas
CREATE TRIGGER on_task_change
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_changes();

-- =============================================
-- 4. BUCKET DE AVATARES
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Políticas de acesso para o bucket de avatares
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 5. ADICIONAR COLUNA AVATAR_URL AO PROFILES
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 1. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Master admin can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (is_master_admin(auth.uid()));

CREATE POLICY "Admin can view own account audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_entity_name text;
  v_action text;
  v_details jsonb := '{}'::jsonb;
  v_entity_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_action := lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

  -- Get entity name based on table
  IF TG_TABLE_NAME = 'clients' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    SELECT c.owner_id INTO v_owner_id FROM clients c WHERE c.id = COALESCE(NEW.client_id, OLD.client_id);
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    SELECT c.owner_id INTO v_owner_id FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
  ELSIF TG_TABLE_NAME = 'contracts' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.full_name ELSE NEW.full_name END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
  END IF;

  -- Build details for updates
  IF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object('old_name', 
      CASE TG_TABLE_NAME
        WHEN 'clients' THEN OLD.name
        WHEN 'projects' THEN OLD.name
        WHEN 'tasks' THEN OLD.name
        WHEN 'proposals' THEN OLD.title
        WHEN 'contracts' THEN OLD.title
        WHEN 'profiles' THEN OLD.full_name
      END
    );
  END IF;

  INSERT INTO public.audit_logs (user_id, owner_id, action, entity_type, entity_id, entity_name, details)
  VALUES (v_user_id, COALESCE(v_owner_id, v_user_id), v_action, TG_TABLE_NAME, v_entity_id, v_entity_name, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Attach triggers
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_proposals AFTER INSERT OR UPDATE OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

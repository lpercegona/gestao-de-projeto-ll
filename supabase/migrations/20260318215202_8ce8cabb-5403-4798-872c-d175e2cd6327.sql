
-- 1. Allow clients to view their own proposals
CREATE POLICY "Clients can view own proposals"
  ON public.proposals
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND client_id = get_user_client_id(auth.uid())
  );

-- 2. Fix audit_log_trigger: the generic UPDATE CASE block tries OLD.title for all tables,
--    but 'clients', 'projects', 'tasks' use 'name' not 'title'. Replace the function.
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_entity_name text;
  v_action text;
  v_details jsonb := '{}'::jsonb;
  v_entity_id uuid;
  v_old_name text;
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

  -- Get entity name and owner based on table
  IF TG_TABLE_NAME = 'clients' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
    IF TG_OP = 'UPDATE' THEN v_old_name := OLD.name; END IF;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    SELECT c.owner_id INTO v_owner_id FROM clients c WHERE c.id = COALESCE(NEW.client_id, OLD.client_id);
    IF TG_OP = 'UPDATE' THEN v_old_name := OLD.name; END IF;
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    SELECT c.owner_id INTO v_owner_id FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
    IF TG_OP = 'UPDATE' THEN v_old_name := OLD.name; END IF;
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
    IF TG_OP = 'UPDATE' THEN v_old_name := OLD.title; END IF;
  ELSIF TG_TABLE_NAME = 'contracts' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
    IF TG_OP = 'UPDATE' THEN v_old_name := OLD.title; END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_entity_name := CASE WHEN TG_OP = 'DELETE' THEN OLD.full_name ELSE NEW.full_name END;
    v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
    IF TG_OP = 'UPDATE' THEN v_old_name := OLD.full_name; END IF;
  END IF;

  -- Build details for updates
  IF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object('old_name', v_old_name);
  END IF;

  INSERT INTO public.audit_logs (user_id, owner_id, action, entity_type, entity_id, entity_name, details)
  VALUES (v_user_id, COALESCE(v_owner_id, v_user_id), v_action, TG_TABLE_NAME, v_entity_id, v_entity_name, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create client-owned projects (including optional initial tasks) safely via RPC
CREATE OR REPLACE FUNCTION public.create_client_owned_project(
  p_client_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_custom_fields jsonb DEFAULT '{}'::jsonb,
  p_tasks jsonb DEFAULT '[]'::jsonb
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_client_owner_id uuid;
  v_task jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Nome do projeto é obrigatório';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = p_client_id
        AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = p_client_id
        AND cu.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_master_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Sem permissão para criar projeto neste cliente';
  END IF;

  SELECT c.owner_id INTO v_client_owner_id
  FROM public.clients c
  WHERE c.id = p_client_id;

  INSERT INTO public.projects (
    client_id,
    name,
    description,
    status,
    due_date,
    custom_fields,
    owner_id,
    created_by
  )
  VALUES (
    p_client_id,
    btrim(p_name),
    NULLIF(p_description, ''),
    'active',
    p_due_date,
    COALESCE(p_custom_fields, '{}'::jsonb),
    v_client_owner_id,
    auth.uid()
  )
  RETURNING * INTO v_project;

  FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(p_tasks, '[]'::jsonb))
  LOOP
    IF COALESCE(NULLIF(btrim(v_task->>'name'), ''), '') <> '' THEN
      INSERT INTO public.tasks (
        project_id,
        name,
        description,
        status,
        due_date,
        created_by
      ) VALUES (
        v_project.id,
        btrim(v_task->>'name'),
        NULLIF(v_task->>'description', ''),
        COALESCE(NULLIF(v_task->>'status', ''), 'pending'),
        NULLIF(v_task->>'due_date', '')::date,
        auth.uid()
      );
    END IF;
  END LOOP;

  RETURN v_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_owned_project(uuid, text, text, date, jsonb, jsonb) TO authenticated;

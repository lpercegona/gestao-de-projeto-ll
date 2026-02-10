-- Fix get_user_client_id to support both multi-user client_users and legacy owner mapping in clients.user_id
-- This is required by RLS policies (e.g. project_requests insert/view) that depend on this helper.
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT cu.client_id
      FROM public.client_users cu
      WHERE cu.user_id = _user_id
      LIMIT 1
    ),
    (
      SELECT c.id
      FROM public.clients c
      WHERE c.user_id = _user_id
      LIMIT 1
    )
  )
$$;

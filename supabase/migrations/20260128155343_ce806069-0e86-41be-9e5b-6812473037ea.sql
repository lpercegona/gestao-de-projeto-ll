-- Atualizar função get_user_client_id para verificar client_users e também clients.user_id
-- Isso permite acesso tanto para usuários vinculados quanto para conta principal do cliente
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

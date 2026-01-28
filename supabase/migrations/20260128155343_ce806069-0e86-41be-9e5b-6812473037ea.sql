-- Atualizar função get_user_client_id para verificar client_users
-- Isso permite que TODOS os usuários vinculados via client_users tenham acesso aos dados do cliente
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Verifica client_users (sistema multi-usuário)
  SELECT cu.client_id 
  FROM public.client_users cu
  WHERE cu.user_id = _user_id
  LIMIT 1
$$;
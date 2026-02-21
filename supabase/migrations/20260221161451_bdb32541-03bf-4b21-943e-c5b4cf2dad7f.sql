
-- 1. Adicionar coluna requested_tasks na tabela project_requests
ALTER TABLE public.project_requests ADD COLUMN requested_tasks jsonb DEFAULT '[]'::jsonb;

-- 2. Criar política RLS para clientes inserirem projetos
CREATE POLICY "Clients can insert own projects"
ON public.projects FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role) 
  AND client_id = get_user_client_id(auth.uid())
  AND created_by = auth.uid()
);

-- Adicionar prazo para projetos
ALTER TABLE public.projects 
ADD COLUMN due_date date NULL;

-- Adicionar prazo para tarefas
ALTER TABLE public.tasks 
ADD COLUMN due_date date NULL;

-- Adicionar prazo desejado para solicitações de projeto
ALTER TABLE public.project_requests 
ADD COLUMN desired_deadline date NULL;

-- Criar tabela de solicitações de edição
CREATE TABLE public.edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'project_request')),
  entity_id uuid NOT NULL,
  client_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  original_data jsonb NOT NULL,
  proposed_data jsonb NOT NULL,
  admin_notes text NULL,
  processed_by uuid NULL,
  processed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

-- Clientes podem criar solicitações para suas entidades
CREATE POLICY "Clients can create edit requests" ON public.edit_requests
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'client'::app_role) 
  AND client_id = get_user_client_id(auth.uid())
  AND requested_by = auth.uid()
);

-- Clientes podem ver suas próprias solicitações
CREATE POLICY "Clients can view own edit requests" ON public.edit_requests
FOR SELECT USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND client_id = get_user_client_id(auth.uid())
);

-- Admins podem gerenciar solicitações dos seus clientes
CREATE POLICY "Admin can manage own client edit requests" ON public.edit_requests
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = edit_requests.client_id 
    AND c.owner_id = auth.uid()
  )
);

-- Master admin pode gerenciar todas
CREATE POLICY "Master admin can manage all edit requests" ON public.edit_requests
FOR ALL USING (is_master_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_edit_requests_updated_at
BEFORE UPDATE ON public.edit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
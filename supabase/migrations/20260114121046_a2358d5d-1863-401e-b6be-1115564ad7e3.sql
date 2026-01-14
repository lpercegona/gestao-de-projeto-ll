-- =============================================
-- FASE 1B: Reestruturação do Banco de Dados
-- Sistema Multi-Tenant com Hierarquia de Usuários
-- =============================================

-- 1.2 Adicionar campo owner_id na tabela profiles (Admin que criou o usuário)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- 1.3 Adicionar campos owner_id e created_by na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 1.4 Adicionar campos owner_id e created_by na tabela projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 1.5 Adicionar campo created_by na tabela tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 1.6 Adicionar campo created_by na tabela time_entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 1.7 Criar tabela user_project_access para vincular colaboradores/clientes a projetos
CREATE TABLE IF NOT EXISTS user_project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Habilitar RLS na nova tabela
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

-- 1.8 Criar funções auxiliares para verificação de roles

-- Função para verificar se é master_admin
CREATE OR REPLACE FUNCTION is_master_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'master_admin'
  );
$$;

-- Função para verificar se é admin ou master_admin
CREATE OR REPLACE FUNCTION is_admin_or_master(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role IN ('admin', 'master_admin')
  );
$$;

-- Função para verificar se é colaborador
CREATE OR REPLACE FUNCTION is_collaborator(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'collaborator'
  );
$$;

-- Função para obter o owner_id de um usuário (retorna o admin que o criou)
CREATE OR REPLACE FUNCTION get_user_owner_id(check_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM profiles WHERE user_id = check_user_id;
$$;

-- Função para verificar se usuário tem acesso a um projeto
CREATE OR REPLACE FUNCTION can_access_project(check_user_id uuid, check_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_project_access
    WHERE user_id = check_user_id AND project_id = check_project_id
  );
$$;

-- Função para verificar se usuário pode editar um projeto
CREATE OR REPLACE FUNCTION can_edit_project(check_user_id uuid, check_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_project_access
    WHERE user_id = check_user_id AND project_id = check_project_id AND can_edit = true
  );
$$;

-- 1.9 Atualizar trigger handle_new_user para atribuir master_admin ao primeiro usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Criar perfil do usuário
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  -- Verificar se é o primeiro usuário
  SELECT COUNT(*) INTO user_count FROM auth.users;

  -- Se for o primeiro usuário, atribuir master_admin
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'master_admin');
  END IF;

  RETURN NEW;
END;
$$;

-- 1.10 Políticas RLS para user_project_access

-- Master admin pode gerenciar todos os acessos
CREATE POLICY "Master admin can manage all project access"
ON user_project_access
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar acessos dos seus próprios projetos
CREATE POLICY "Admin can manage own project access"
ON user_project_access
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = user_project_access.project_id AND p.owner_id = auth.uid()
  )
);

-- Usuários podem ver seus próprios acessos
CREATE POLICY "Users can view own project access"
ON user_project_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 1.11 Atualizar políticas RLS para profiles (permitir admins verem usuários)

-- Remover política antiga de select
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Master admin pode ver todos os perfis
CREATE POLICY "Master admin can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode ver perfis dos usuários que criou
CREATE POLICY "Admin can view owned profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND (
    owner_id = auth.uid() OR 
    user_id = auth.uid()
  )
);

-- Usuário pode ver próprio perfil
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 1.12 Atualizar políticas RLS para user_roles

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Master admin pode gerenciar todos os roles
CREATE POLICY "Master admin can manage all roles"
ON user_roles
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar roles de colaboradores e clientes que criou
CREATE POLICY "Admin can manage owned user roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = user_roles.user_id AND p.owner_id = auth.uid()
  ) AND
  user_roles.role IN ('collaborator', 'client')
);

-- 1.13 Atualizar políticas RLS para clients

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all clients" ON clients;

-- Master admin pode gerenciar todos os clientes
CREATE POLICY "Master admin can manage all clients"
ON clients
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar clientes que criou
CREATE POLICY "Admin can manage own clients"
ON clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- 1.14 Atualizar políticas RLS para projects

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;

-- Master admin pode gerenciar todos os projetos
CREATE POLICY "Master admin can manage all projects"
ON projects
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar projetos que criou
CREATE POLICY "Admin can manage own projects"
ON projects
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- Colaborador pode ver/editar projetos com acesso
CREATE POLICY "Collaborator can view accessible projects"
ON projects
FOR SELECT
TO authenticated
USING (
  is_collaborator(auth.uid()) AND can_access_project(auth.uid(), id)
);

CREATE POLICY "Collaborator can update accessible projects"
ON projects
FOR UPDATE
TO authenticated
USING (
  is_collaborator(auth.uid()) AND can_edit_project(auth.uid(), id)
);

CREATE POLICY "Collaborator can insert projects"
ON projects
FOR INSERT
TO authenticated
WITH CHECK (
  is_collaborator(auth.uid()) AND created_by = auth.uid()
);

-- 1.15 Atualizar políticas RLS para tasks

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;

-- Master admin pode gerenciar todas as tarefas
CREATE POLICY "Master admin can manage all tasks"
ON tasks
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar tarefas de seus projetos
CREATE POLICY "Admin can manage own project tasks"
ON tasks
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND p.owner_id = auth.uid())
);

-- Colaborador pode gerenciar tarefas de projetos acessíveis
CREATE POLICY "Collaborator can manage accessible project tasks"
ON tasks
FOR ALL
TO authenticated
USING (
  is_collaborator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM user_project_access upa
    WHERE upa.user_id = auth.uid() AND upa.project_id = tasks.project_id AND upa.can_edit = true
  )
);

CREATE POLICY "Collaborator can view accessible project tasks"
ON tasks
FOR SELECT
TO authenticated
USING (
  is_collaborator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM user_project_access upa
    WHERE upa.user_id = auth.uid() AND upa.project_id = tasks.project_id
  )
);

-- 1.16 Atualizar políticas RLS para time_entries

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all time entries" ON time_entries;

-- Master admin pode gerenciar todos os registros
CREATE POLICY "Master admin can manage all time entries"
ON time_entries
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar registros de seus projetos
CREATE POLICY "Admin can manage own project time entries"
ON time_entries
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM tasks t 
    JOIN projects p ON p.id = t.project_id 
    WHERE t.id = time_entries.task_id AND p.owner_id = auth.uid()
  )
);

-- Colaborador pode gerenciar registros de projetos acessíveis
CREATE POLICY "Collaborator can manage accessible time entries"
ON time_entries
FOR ALL
TO authenticated
USING (
  is_collaborator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN user_project_access upa ON upa.project_id = t.project_id
    WHERE t.id = time_entries.task_id AND upa.user_id = auth.uid() AND upa.can_edit = true
  )
);

CREATE POLICY "Collaborator can view accessible time entries"
ON time_entries
FOR SELECT
TO authenticated
USING (
  is_collaborator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN user_project_access upa ON upa.project_id = t.project_id
    WHERE t.id = time_entries.task_id AND upa.user_id = auth.uid()
  )
);

-- 1.17 Atualizar políticas RLS para project_columns

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage project columns" ON project_columns;

-- Master admin pode gerenciar todas as colunas
CREATE POLICY "Master admin can manage project columns"
ON project_columns
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()));

-- Admin pode gerenciar colunas
CREATE POLICY "Admin can manage project columns"
ON project_columns
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Colaborador pode ver colunas
CREATE POLICY "Collaborator can view project columns"
ON project_columns
FOR SELECT
TO authenticated
USING (is_collaborator(auth.uid()));

-- 1.18 Migração de dados existentes - Atribuir master_admin ao primeiro usuário admin existente
DO $$
DECLARE
  first_admin_id uuid;
BEGIN
  -- Encontrar o primeiro admin
  SELECT user_id INTO first_admin_id 
  FROM user_roles 
  WHERE role = 'admin' 
  ORDER BY (SELECT created_at FROM profiles WHERE profiles.user_id = user_roles.user_id) 
  LIMIT 1;

  -- Se encontrou um admin, converter para master_admin
  IF first_admin_id IS NOT NULL THEN
    UPDATE user_roles SET role = 'master_admin' WHERE user_id = first_admin_id;
    
    -- Atribuir owner_id para todos os registros existentes
    UPDATE profiles SET owner_id = first_admin_id WHERE owner_id IS NULL AND user_id != first_admin_id;
    UPDATE clients SET owner_id = first_admin_id, created_by = first_admin_id WHERE owner_id IS NULL;
    UPDATE projects SET owner_id = first_admin_id, created_by = first_admin_id WHERE owner_id IS NULL;
    UPDATE tasks SET created_by = first_admin_id WHERE created_by IS NULL;
    UPDATE time_entries SET created_by = first_admin_id WHERE created_by IS NULL;
  END IF;
END;
$$;


# Corrigir Visibilidade de Avatares nos Projetos

## Problema

As politicas RLS da tabela `profiles` restringem a visibilidade de perfis por papel:
- Admin so ve perfis onde `owner_id = auth.uid()` -- nao ve perfis de outros admins ou usuarios nao criados por ele
- Cliente ve perfis via `user_project_access`, mas o owner do projeto pode nao estar nessa tabela
- Resultado: avatares incompletos para todos os papeis

## Solucao

Adicionar uma politica RLS na tabela `profiles` que permita qualquer usuario autenticado visualizar perfis de pessoas que compartilham o mesmo projeto (via `user_project_access`, `owner_id` ou `created_by` do projeto).

## Secao Tecnica

### Migracao SQL

Nova politica RLS na tabela `profiles`:

```text
"Users can view profiles of shared project members"
  - SELECT
  - Permite ver perfis de usuarios que:
    1. Estao em user_project_access do mesmo projeto que o usuario logado
    2. Sao owner_id ou created_by de um projeto ao qual o usuario logado tem acesso
    3. O usuario logado e owner_id/created_by de um projeto onde o perfil alvo tem acesso

A politica usa uma subquery que cruza projetos compartilhados entre
auth.uid() e profiles.user_id, considerando tanto user_project_access
quanto os campos owner_id e created_by dos projetos.
```

Logica SQL da politica:

```text
CREATE POLICY "Users can view profiles of shared project members"
ON profiles FOR SELECT
USING (
  EXISTS (
    -- Projetos que o usuario logado pode acessar
    SELECT 1 FROM projects p
    WHERE (
      -- usuario logado tem acesso via user_project_access, ou e owner/created_by
      p.owner_id = auth.uid()
      OR p.created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM user_project_access upa WHERE upa.project_id = p.id AND upa.user_id = auth.uid())
      OR p.client_id = get_user_client_id(auth.uid())
    )
    AND (
      -- o perfil alvo tambem tem acesso ao mesmo projeto
      p.owner_id = profiles.user_id
      OR p.created_by = profiles.user_id
      OR EXISTS (SELECT 1 FROM user_project_access upa2 WHERE upa2.project_id = p.id AND upa2.user_id = profiles.user_id)
    )
  )
);
```

### Arquivos modificados

Nenhuma mudanca em codigo frontend -- o componente `ProjectKanbanView.tsx` ja busca perfis corretamente via `supabase.from("profiles").select(...)`. O problema e exclusivamente de RLS impedindo a leitura dos perfis.


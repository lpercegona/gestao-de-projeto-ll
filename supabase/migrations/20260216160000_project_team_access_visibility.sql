-- Permite que qualquer usuário autenticado veja os acessos de outros membros
-- nos mesmos projetos aos quais ele já possui acesso (edição ou visualização).
CREATE POLICY "Users can view team project access"
ON public.user_project_access
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_project_access my_access
    WHERE my_access.project_id = user_project_access.project_id
      AND my_access.user_id = auth.uid()
  )
);

-- Permite ver perfis dos membros que compartilham projeto com o usuário autenticado.
-- Necessário para exibir avatar/nome dos participantes dos cards.
CREATE POLICY "Users can view profiles of project teammates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_project_access my_access
    JOIN public.user_project_access teammate_access
      ON teammate_access.project_id = my_access.project_id
    WHERE my_access.user_id = auth.uid()
      AND teammate_access.user_id = profiles.user_id
  )
);

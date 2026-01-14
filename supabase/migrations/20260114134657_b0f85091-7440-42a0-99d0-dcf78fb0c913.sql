-- Add policy for collaborators to view clients of projects they have access to
CREATE POLICY "Collaborator can view clients of accessible projects"
ON public.clients
FOR SELECT
USING (
  is_collaborator(auth.uid()) 
  AND EXISTS (
    SELECT 1 
    FROM projects p
    JOIN user_project_access upa ON upa.project_id = p.id
    WHERE p.client_id = clients.id 
    AND upa.user_id = auth.uid()
  )
);

-- Add policy for collaborators to view profiles of project team members
CREATE POLICY "Collaborator can view profiles of team members"
ON public.profiles
FOR SELECT
USING (
  is_collaborator(auth.uid())
  AND (
    -- Can view own profile
    user_id = auth.uid()
    OR
    -- Can view profiles of users in same projects
    EXISTS (
      SELECT 1 
      FROM user_project_access my_access
      JOIN user_project_access other_access ON my_access.project_id = other_access.project_id
      WHERE my_access.user_id = auth.uid() 
      AND other_access.user_id = profiles.user_id
    )
  )
);
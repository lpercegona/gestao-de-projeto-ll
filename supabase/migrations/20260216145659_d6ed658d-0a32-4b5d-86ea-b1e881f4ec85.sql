
-- Allow clients to view project access records for their own projects
CREATE POLICY "Clients can view project access for own projects"
ON user_project_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = user_project_access.project_id
      AND p.client_id = get_user_client_id(auth.uid())
  )
);

-- Allow clients to view profiles of collaborators assigned to their projects
CREATE POLICY "Clients can view profiles of project members"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_project_access upa
    JOIN projects p ON p.id = upa.project_id
    WHERE upa.user_id = profiles.user_id
      AND p.client_id = get_user_client_id(auth.uid())
  )
);


CREATE POLICY "Users can view profiles of shared project members"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE (
      p.owner_id = auth.uid()
      OR p.created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM user_project_access upa WHERE upa.project_id = p.id AND upa.user_id = auth.uid())
      OR p.client_id = get_user_client_id(auth.uid())
    )
    AND (
      p.owner_id = profiles.user_id
      OR p.created_by = profiles.user_id
      OR EXISTS (SELECT 1 FROM user_project_access upa2 WHERE upa2.project_id = p.id AND upa2.user_id = profiles.user_id)
    )
  )
);

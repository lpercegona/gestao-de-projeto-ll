-- Ensure clients can view profiles of users related to their projects,
-- including owner/creator even when there is no user_project_access row.
DROP POLICY IF EXISTS "Clients can view profiles of project members" ON profiles;

CREATE POLICY "Clients can view profiles of project members"
ON profiles FOR SELECT
USING (
  profiles.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM projects p
    LEFT JOIN user_project_access upa
      ON upa.project_id = p.id
      AND upa.user_id = profiles.user_id
    WHERE p.client_id = get_user_client_id(auth.uid())
      AND (
        upa.user_id IS NOT NULL
        OR profiles.user_id = p.owner_id
        OR profiles.user_id = p.created_by
      )
  )
);

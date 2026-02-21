-- Consolidate profiles visibility rules for shared project contexts.
-- Removes older overlapping policies to avoid ambiguous rule combinations.
DROP POLICY IF EXISTS "Users can view profiles of project teammates" ON public.profiles;
DROP POLICY IF EXISTS "Clients can view profiles of project members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of shared project members" ON public.profiles;

CREATE POLICY "Users can view profiles of shared project members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE (
      p.owner_id = auth.uid()
      OR p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_project_access upa_requester
        WHERE upa_requester.project_id = p.id
          AND upa_requester.user_id = auth.uid()
      )
      OR p.client_id = get_user_client_id(auth.uid())
    )
    AND (
      p.owner_id = profiles.user_id
      OR p.created_by = profiles.user_id
      OR EXISTS (
        SELECT 1
        FROM public.user_project_access upa_target
        WHERE upa_target.project_id = p.id
          AND upa_target.user_id = profiles.user_id
      )
    )
  )
);

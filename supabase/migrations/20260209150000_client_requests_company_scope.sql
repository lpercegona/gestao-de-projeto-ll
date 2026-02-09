-- Garantir que usuários vinculados à mesma empresa visualizem todas as solicitações do cliente
-- (project_requests + edit_requests), mantendo compatibilidade com o vínculo legado clients.user_id.

DROP POLICY IF EXISTS "Clients can view own project requests" ON public.project_requests;
CREATE POLICY "Clients can view own project requests"
ON public.project_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = project_requests.client_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.client_users cu
          WHERE cu.client_id = c.id
            AND cu.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Clients can create own project requests" ON public.project_requests;
CREATE POLICY "Clients can create own project requests"
ON public.project_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = project_requests.client_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.client_users cu
          WHERE cu.client_id = c.id
            AND cu.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Clients can view own edit requests" ON public.edit_requests;
CREATE POLICY "Clients can view own edit requests"
ON public.edit_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = edit_requests.client_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.client_users cu
          WHERE cu.client_id = c.id
            AND cu.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Clients can create edit requests" ON public.edit_requests;
CREATE POLICY "Clients can create edit requests"
ON public.edit_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role)
  AND requested_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = edit_requests.client_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.client_users cu
          WHERE cu.client_id = c.id
            AND cu.user_id = auth.uid()
        )
      )
  )
);

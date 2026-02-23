-- Clients can update own projects
CREATE POLICY "Clients can update own projects"
ON public.projects FOR UPDATE
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND created_by = auth.uid() 
  AND client_id = get_user_client_id(auth.uid())
);

-- Clients can delete own projects
CREATE POLICY "Clients can delete own projects"
ON public.projects FOR DELETE
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND created_by = auth.uid() 
  AND client_id = get_user_client_id(auth.uid())
);
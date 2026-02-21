
-- Allow clients to insert their own tasks in projects belonging to their client
CREATE POLICY "Clients can insert own tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
    AND p.client_id = get_user_client_id(auth.uid())
  )
);

-- Allow clients to update their own tasks
CREATE POLICY "Clients can update own tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND created_by = auth.uid()
);

-- Allow clients to delete their own tasks
CREATE POLICY "Clients can delete own tasks"
ON public.tasks
FOR DELETE
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND created_by = auth.uid()
);

-- Allow clients to manage time entries for their own tasks
CREATE POLICY "Clients can manage own task time entries"
ON public.time_entries
FOR ALL
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = time_entries.task_id
    AND t.created_by = auth.uid()
  )
);

-- Allow clients to manage timers for their own tasks
CREATE POLICY "Clients can manage own task timers"
ON public.task_timers
FOR ALL
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_timers.task_id
    AND t.created_by = auth.uid()
  )
);

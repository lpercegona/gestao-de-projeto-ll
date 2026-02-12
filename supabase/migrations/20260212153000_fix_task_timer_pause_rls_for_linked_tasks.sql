-- Fix RLS for linked task timers so admins/collaborators can pause their own timers
-- when they have access to the project (including project owner).

-- Remove legacy linked-timer policies that were too restrictive for pause/resume flows.
DROP POLICY IF EXISTS "Admin can manage own project timers" ON public.task_timers;
DROP POLICY IF EXISTS "Collaborator can manage accessible project timers" ON public.task_timers;

-- Ensure users can manage their own linked timers when they can access the related project.
-- Master admin continues to be covered by the existing "Master admin can manage all timers" policy.
CREATE POLICY "Users can manage own linked task timers"
ON public.task_timers
FOR ALL
USING (
  user_id = auth.uid()
  AND task_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_timers.task_id
      AND (
        p.owner_id = auth.uid()
        OR public.can_access_project(auth.uid(), t.project_id)
      )
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND task_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_timers.task_id
      AND (
        p.owner_id = auth.uid()
        OR public.can_access_project(auth.uid(), t.project_id)
      )
  )
);

-- Keep a symmetric policy for unlinked quick timers with both USING/WITH CHECK.
DROP POLICY IF EXISTS "Users can manage own unlinked timers" ON public.task_timers;
CREATE POLICY "Users can manage own unlinked timers"
ON public.task_timers
FOR ALL
USING (user_id = auth.uid() AND task_id IS NULL)
WITH CHECK (user_id = auth.uid() AND task_id IS NULL);

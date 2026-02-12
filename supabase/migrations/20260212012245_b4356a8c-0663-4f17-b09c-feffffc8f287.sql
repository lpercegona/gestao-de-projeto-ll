
-- Make task_id nullable to support quick timers (without linked task)
ALTER TABLE public.task_timers ALTER COLUMN task_id DROP NOT NULL;

-- Drop the foreign key constraint so task_id can be null without referencing tasks
-- (The FK is still valid for non-null values)
ALTER TABLE public.task_timers DROP CONSTRAINT IF EXISTS task_timers_task_id_fkey;
ALTER TABLE public.task_timers ADD CONSTRAINT task_timers_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- RLS policy for users managing their own unlinked timers
CREATE POLICY "Users can manage own unlinked timers"
ON public.task_timers
FOR ALL
USING (user_id = auth.uid() AND task_id IS NULL);

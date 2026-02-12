-- Ensure each user can have only one active timer record at a time
CREATE UNIQUE INDEX IF NOT EXISTS task_timers_user_id_unique_active
ON public.task_timers (user_id);

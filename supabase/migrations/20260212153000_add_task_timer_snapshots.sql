ALTER TABLE public.task_timers
ADD COLUMN IF NOT EXISTS task_title_snapshot TEXT,
ADD COLUMN IF NOT EXISTS task_description_snapshot TEXT,
ADD COLUMN IF NOT EXISTS project_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS client_name_snapshot TEXT;

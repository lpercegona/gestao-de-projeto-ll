-- Align pause columns on task_timers for cross-device sync
ALTER TABLE public.task_timers
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS paused_elapsed_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.task_timers
  ALTER COLUMN paused_at SET DEFAULT NULL,
  ALTER COLUMN paused_elapsed_seconds SET DEFAULT 0;

-- Ensure task_timers is published in supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'task_timers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_timers;
  END IF;
END
$$;

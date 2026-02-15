DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'task_timers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_timers;
  END IF;
END
$$;

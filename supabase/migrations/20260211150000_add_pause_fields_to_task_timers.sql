alter table public.task_timers
  add column if not exists paused_at timestamptz null,
  add column if not exists paused_elapsed_seconds integer not null default 0;

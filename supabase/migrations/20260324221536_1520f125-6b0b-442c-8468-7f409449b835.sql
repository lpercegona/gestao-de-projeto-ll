ALTER TABLE public.report_custom_metrics 
  ADD COLUMN IF NOT EXISTS block_title text NOT NULL DEFAULT '';
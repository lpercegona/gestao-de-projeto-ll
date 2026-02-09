ALTER TABLE public.project_requests
ADD COLUMN IF NOT EXISTS custom_fields jsonb;

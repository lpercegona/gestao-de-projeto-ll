
ALTER TABLE public.project_requests
  DROP CONSTRAINT project_requests_converted_project_id_fkey;
ALTER TABLE public.project_requests
  ADD CONSTRAINT project_requests_converted_project_id_fkey
  FOREIGN KEY (converted_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

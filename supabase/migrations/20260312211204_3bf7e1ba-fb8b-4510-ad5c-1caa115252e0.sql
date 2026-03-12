
-- Fix proposals FK to cascade on client delete
ALTER TABLE public.proposals
  DROP CONSTRAINT proposals_client_id_fkey;
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Fix contracts FK to cascade on client delete
ALTER TABLE public.contracts
  DROP CONSTRAINT contracts_client_id_fkey;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Fix edit_requests FK (NO ACTION via fk_edit_requests_client)
ALTER TABLE public.edit_requests
  DROP CONSTRAINT fk_edit_requests_client;
ALTER TABLE public.edit_requests
  ADD CONSTRAINT fk_edit_requests_client
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Fix duplicate project_requests FK (NO ACTION)
ALTER TABLE public.project_requests
  DROP CONSTRAINT project_requests_client_id_fkey;
ALTER TABLE public.project_requests
  ADD CONSTRAINT project_requests_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

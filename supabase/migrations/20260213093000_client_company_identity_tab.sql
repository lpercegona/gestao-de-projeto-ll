-- Campos de identidade da empresa para clientes
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS identity_guidelines text,
ADD COLUMN IF NOT EXISTS identity_attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Permitir que usuários cliente atualizem o próprio registro da empresa
DROP POLICY IF EXISTS "Clients can update own client record" ON public.clients;
CREATE POLICY "Clients can update own client record"
ON public.clients
FOR UPDATE
USING (
  (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = clients.id
      AND cu.user_id = auth.uid()
    )
  )
  OR user_id = auth.uid()
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = clients.id
      AND cu.user_id = auth.uid()
    )
  )
  OR user_id = auth.uid()
);

-- Bucket para anexos de identidade de marca da empresa
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-identity-files', 'client-identity-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas básicas de storage para anexos de identidade
DROP POLICY IF EXISTS "Authenticated can view client identity files" ON storage.objects;
CREATE POLICY "Authenticated can view client identity files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-identity-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can upload client identity files" ON storage.objects;
CREATE POLICY "Authenticated can upload client identity files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'client-identity-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update client identity files" ON storage.objects;
CREATE POLICY "Authenticated can update client identity files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'client-identity-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete client identity files" ON storage.objects;
CREATE POLICY "Authenticated can delete client identity files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'client-identity-files' AND auth.role() = 'authenticated');

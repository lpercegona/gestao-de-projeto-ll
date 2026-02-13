-- Corrige permissões para evitar desvinculação indevida de cliente-admin
-- Remover update direto amplo da tabela clients para usuários cliente
DROP POLICY IF EXISTS "Clients can update own client record" ON public.clients;

-- Função restrita para atualização de identidade do cliente
CREATE OR REPLACE FUNCTION public.update_client_identity_settings(
  p_client_id uuid,
  p_identity_guidelines text,
  p_identity_attachments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_master_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id = p_client_id
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = p_client_id
        AND c.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar identidade deste cliente';
  END IF;

  UPDATE public.clients
  SET
    identity_guidelines = COALESCE(p_identity_guidelines, identity_guidelines),
    identity_attachments = COALESCE(p_identity_attachments, identity_attachments),
    updated_at = now()
  WHERE id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_client_identity_settings(uuid, text, jsonb) TO authenticated;

-- Endurece políticas do bucket de identidade por pasta client_id
DROP POLICY IF EXISTS "Authenticated can view client identity files" ON storage.objects;
CREATE POLICY "Authenticated can view client identity files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-identity-files'
  AND (
    public.is_master_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id::text = (storage.foldername(name))[1]
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Authenticated can upload client identity files" ON storage.objects;
CREATE POLICY "Authenticated can upload client identity files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-identity-files'
  AND (
    public.is_master_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id::text = (storage.foldername(name))[1]
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Authenticated can update client identity files" ON storage.objects;
CREATE POLICY "Authenticated can update client identity files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-identity-files'
  AND (
    public.is_master_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id::text = (storage.foldername(name))[1]
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Authenticated can delete client identity files" ON storage.objects;
CREATE POLICY "Authenticated can delete client identity files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-identity-files'
  AND (
    public.is_master_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id::text = (storage.foldername(name))[1]
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.user_id = auth.uid()
    )
  )
);

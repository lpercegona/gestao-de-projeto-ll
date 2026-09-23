
DROP POLICY IF EXISTS "Authenticated can read email templates" ON public.email_templates;
CREATE POLICY "Users read own or global email templates" ON public.email_templates
FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.is_admin_or_master(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can upload portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete portfolio files" ON storage.objects;
CREATE POLICY "Users upload own portfolio files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Users update own portfolio files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = (select auth.uid()::text))
WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Users delete own portfolio files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE OR REPLACE FUNCTION public.can_manage_client_files(_user_id uuid, _client_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id::text = _client_id
      AND (c.owner_id = _user_id OR c.user_id = _user_id OR public.is_master_admin(_user_id)
           OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.client_id = c.id AND cu.user_id = _user_id))
  )
$$;

DROP POLICY IF EXISTS "Authenticated users can upload client identity files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own client identity files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own client identity files" ON storage.objects;
CREATE POLICY "Linked users upload client identity files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-identity-files' AND public.can_manage_client_files((select auth.uid()), (storage.foldername(name))[1]));
CREATE POLICY "Linked users update client identity files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-identity-files' AND public.can_manage_client_files((select auth.uid()), (storage.foldername(name))[1]))
WITH CHECK (bucket_id = 'client-identity-files' AND public.can_manage_client_files((select auth.uid()), (storage.foldername(name))[1]));
CREATE POLICY "Linked users delete client identity files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-identity-files' AND public.can_manage_client_files((select auth.uid()), (storage.foldername(name))[1]));

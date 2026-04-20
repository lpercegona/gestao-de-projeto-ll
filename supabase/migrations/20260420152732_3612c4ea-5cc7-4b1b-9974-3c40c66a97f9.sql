-- Add attachments column to project_requests
ALTER TABLE public.project_requests
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create public storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Public read (bucket is public but explicit policy)
CREATE POLICY "Public can view request attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'request-attachments');

-- Admin can manage objects for their own clients
CREATE POLICY "Admin can manage own client request attachments"
ON storage.objects FOR ALL
USING (
  bucket_id = 'request-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'request-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
);

-- Master admin full access
CREATE POLICY "Master admin can manage all request attachments"
ON storage.objects FOR ALL
USING (bucket_id = 'request-attachments' AND is_master_admin(auth.uid()))
WITH CHECK (bucket_id = 'request-attachments' AND is_master_admin(auth.uid()));

-- Authenticated clients can upload to their own client folder
CREATE POLICY "Clients can upload own request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments'
  AND has_role(auth.uid(), 'client'::app_role)
  AND (storage.foldername(name))[1] = get_user_client_id(auth.uid())::text
);

CREATE POLICY "Clients can view own request attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'request-attachments'
  AND (storage.foldername(name))[1] = get_user_client_id(auth.uid())::text
);

CREATE POLICY "Clients can delete own request attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'request-attachments'
  AND has_role(auth.uid(), 'client'::app_role)
  AND (storage.foldername(name))[1] = get_user_client_id(auth.uid())::text
);
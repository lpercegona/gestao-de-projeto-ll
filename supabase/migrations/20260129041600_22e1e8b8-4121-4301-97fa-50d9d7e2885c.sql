-- Create client-logos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'client-logos', true);

-- Policy to allow admins to upload logos
CREATE POLICY "Admins can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND is_admin_or_master(auth.uid())
);

-- Policy to allow anyone to view logos
CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Policy to allow admins to update logos
CREATE POLICY "Admins can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-logos' AND is_admin_or_master(auth.uid()));

-- Policy to allow admins to delete logos
CREATE POLICY "Admins can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos' AND is_admin_or_master(auth.uid()));

-- Add show_in_report column to project_columns
ALTER TABLE public.project_columns
ADD COLUMN show_in_report boolean NOT NULL DEFAULT false;

-- Update RPC to filter by show_in_report
CREATE OR REPLACE FUNCTION public.get_shared_report_project_columns(p_token text)
RETURNS TABLE(column_id uuid, column_name text, column_type text, column_options text[])
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    pc.id as column_id,
    pc.name as column_name,
    pc.type as column_type,
    pc.options as column_options
  FROM project_columns pc
  JOIN report_shares rs ON pc.client_id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true
    AND pc.show_in_report = true;
$$;
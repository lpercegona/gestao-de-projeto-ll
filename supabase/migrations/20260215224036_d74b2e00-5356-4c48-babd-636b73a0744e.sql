CREATE POLICY "Admin can read global smtp settings" ON public.smtp_settings
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND owner_id IS NULL
);
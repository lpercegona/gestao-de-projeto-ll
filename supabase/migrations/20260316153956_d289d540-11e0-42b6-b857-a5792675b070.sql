
-- Create reminders table
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  reminder_date date NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Admin can manage own reminders
CREATE POLICY "Admin can manage own reminders"
ON public.reminders
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Master admin can manage all reminders
CREATE POLICY "Master admin can manage all reminders"
ON public.reminders
FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

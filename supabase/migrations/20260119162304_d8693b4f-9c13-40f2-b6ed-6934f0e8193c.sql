-- Create table to store multiple users linked to a client
CREATE TABLE public.client_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Policies for client_users
CREATE POLICY "Admins can view all client users"
ON public.client_users
FOR SELECT
USING (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can insert client users"
ON public.client_users
FOR INSERT
WITH CHECK (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can update client users"
ON public.client_users
FOR UPDATE
USING (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can delete client users"
ON public.client_users
FOR DELETE
USING (public.is_admin_or_master(auth.uid()));

-- Clients can view their own records
CREATE POLICY "Clients can view their own client_users records"
ON public.client_users
FOR SELECT
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_client_users_client_id ON public.client_users(client_id);
CREATE INDEX idx_client_users_user_id ON public.client_users(user_id);
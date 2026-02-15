
-- Step 1: Drop the redundant single-argument function
DROP FUNCTION IF EXISTS public.get_proposal_by_token(text);

-- Step 2: Add share_static_html column to proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS share_static_html text DEFAULT NULL;

-- Step 3: Add sections column to proposal_templates
ALTER TABLE public.proposal_templates ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb;

-- Step 4: Create email_templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (is_admin_or_master(auth.uid()));

CREATE POLICY "Anyone can read email templates"
ON public.email_templates
FOR SELECT
USING (true);

-- Seed initial templates
INSERT INTO public.email_templates (slug, subject, body_html) VALUES
('proposal_sent', 'Nova proposta: {{titulo_proposta}}', '<p>Olá {{nome_cliente}},</p><p>Você recebeu uma nova proposta comercial.</p><p><a href="{{link_proposta}}">Clique aqui para visualizar a proposta</a></p><p>Atenciosamente,<br>Equipe</p>'),
('contract_sent', 'Novo contrato: {{titulo_contrato}}', '<p>Olá {{nome_cliente}},</p><p>Você recebeu um novo contrato para revisão e assinatura.</p><p><a href="{{link_contrato}}">Clique aqui para visualizar o contrato</a></p><p>Atenciosamente,<br>Equipe</p>');

-- Step 5: Create proposal-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('proposal-images', 'proposal-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for proposal-images
CREATE POLICY "Anyone can view proposal images"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposal-images');

CREATE POLICY "Admins can upload proposal images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proposal-images' AND is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can update proposal images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'proposal-images' AND is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can delete proposal images"
ON storage.objects FOR DELETE
USING (bucket_id = 'proposal-images' AND is_admin_or_master(auth.uid()));

-- Trigger for updated_at on email_templates
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

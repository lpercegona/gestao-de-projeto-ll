
-- 1. Drop the existing unique constraint on slug
ALTER TABLE public.email_templates DROP CONSTRAINT email_templates_slug_key;

-- 2. Create partial unique index for personal templates (owner_id IS NOT NULL)
CREATE UNIQUE INDEX email_templates_slug_owner_unique 
  ON public.email_templates (slug, owner_id) WHERE owner_id IS NOT NULL;

-- 3. Create partial unique index for global templates (owner_id IS NULL)
CREATE UNIQUE INDEX email_templates_slug_global_unique 
  ON public.email_templates (slug) WHERE owner_id IS NULL;

-- 4. Insert missing global template 'monthly_report_sent'
INSERT INTO public.email_templates (slug, subject, body_html, owner_id)
VALUES (
  'monthly_report_sent',
  'Relatório Mensal - {{periodo_relatorio}}',
  '<p>Olá {{nome_cliente}},</p><p>Segue o relatório mensal referente ao período <strong>{{periodo_relatorio}}</strong>.</p><p>Total de horas registradas: <strong>{{horas_totais}}</strong></p><p>Acesse o relatório completo pelo link abaixo:</p><p><a href="{{link_relatorio}}">Ver Relatório</a></p><p>Atenciosamente,<br/>Equipe</p>',
  NULL
)
ON CONFLICT DO NOTHING;

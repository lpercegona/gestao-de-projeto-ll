INSERT INTO public.email_templates (slug, subject, body_html)
VALUES (
  'monthly_report_sent',
  'Relatório mensal disponível: {{periodo_relatorio}}',
  '<p>Olá {{nome_cliente}},</p><p>Seu relatório mensal referente a {{periodo_relatorio}} já está disponível.</p><p>Total de horas registradas no período: <strong>{{horas_totais}}</strong>.</p><p><a href="{{link_relatorio}}">Clique aqui para acessar o relatório completo</a></p><p>Atenciosamente,<br>Equipe</p>'
)
ON CONFLICT (slug) DO NOTHING;

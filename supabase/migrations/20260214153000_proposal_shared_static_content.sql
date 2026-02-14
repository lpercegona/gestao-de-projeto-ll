-- Render proposal template variables in backend and persist static HTML for shared links
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS shared_content_html TEXT;

CREATE OR REPLACE FUNCTION public.render_proposal_shared_content(
  p_template_id UUID,
  p_recipient_name TEXT,
  p_recipient_email TEXT,
  p_recipient_company TEXT,
  p_description TEXT,
  p_items JSONB,
  p_total_value NUMERIC,
  p_created_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_template_content TEXT;
  v_services_html TEXT;
BEGIN
  IF p_template_id IS NULL THEN
    RETURN '';
  END IF;

  SELECT COALESCE(description, '')
  INTO v_template_content
  FROM public.proposal_templates
  WHERE id = p_template_id;

  IF v_template_content = '' THEN
    RETURN '';
  END IF;

  SELECT COALESCE(
    '<ul>' || string_agg(
      format(
        '<li>%s%s</li>',
        item->>'service',
        CASE
          WHEN COALESCE(NULLIF(item->>'description', ''), '') = '' THEN ''
          ELSE ': ' || item->>'description'
        END
      ),
      ''
    ) || '</ul>',
    ''
  )
  INTO v_services_html
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS item
  WHERE COALESCE(NULLIF(trim(item->>'service'), ''), '') <> '';

  RETURN replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(v_template_content,
                '{{nome_cliente}}', COALESCE(p_recipient_name, '')),
              '{{email_cliente}}', COALESCE(p_recipient_email, '')),
            '{{empresa_cliente}}', COALESCE(p_recipient_company, '')),
          '{{data_envio}}', to_char(COALESCE(p_created_at, now()), 'DD/MM/YYYY')),
        '{{valor_total}}', to_char(COALESCE(p_total_value, 0), '"R$" FM999G999G999G990D00')),
      '{{descricao_proposta}}', COALESCE(p_description, '')),
    '{{listagem_servicos}}', COALESCE(v_services_html, ''));
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_proposal_shared_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.shared_content_html := public.render_proposal_shared_content(
    NEW.template_id,
    NEW.recipient_name,
    NEW.recipient_email,
    NEW.recipient_company,
    NEW.description,
    NEW.items,
    NEW.total_value,
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_proposal_shared_content ON public.proposals;

CREATE TRIGGER trg_sync_proposal_shared_content
BEFORE INSERT OR UPDATE OF template_id, recipient_name, recipient_email, recipient_company, description, items, total_value, created_at
ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.sync_proposal_shared_content();

UPDATE public.proposals
SET shared_content_html = public.render_proposal_shared_content(
  template_id,
  recipient_name,
  recipient_email,
  recipient_company,
  description,
  items,
  total_value,
  created_at
)
WHERE shared_content_html IS NULL;

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token TEXT)
RETURNS TABLE (
  proposal_id UUID,
  template_id UUID,
  template_content TEXT,
  title TEXT,
  description TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_company TEXT,
  items JSONB,
  total_hours NUMERIC,
  total_value NUMERIC,
  status TEXT,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE proposals
  SET status = 'viewed', updated_at = now()
  WHERE share_token = p_token AND status = 'sent';

  RETURN QUERY
  SELECT
    p.id,
    p.template_id,
    COALESCE(p.shared_content_html, ''),
    p.title,
    p.description,
    p.recipient_name,
    p.recipient_email,
    p.recipient_company,
    p.items,
    p.total_hours,
    p.total_value,
    p.status,
    p.valid_until,
    p.created_at
  FROM proposals p
  WHERE p.share_token = p_token;
END;
$$;

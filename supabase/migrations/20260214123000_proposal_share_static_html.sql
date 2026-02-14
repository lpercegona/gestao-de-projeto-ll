ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS share_static_html TEXT;

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token TEXT)
RETURNS TABLE (
  proposal_id UUID,
  template_id UUID,
  template_content TEXT,
  share_static_html TEXT,
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
    t.description,
    p.share_static_html,
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
  LEFT JOIN proposal_templates t ON t.id = p.template_id
  WHERE p.share_token = p_token;
END;
$$;

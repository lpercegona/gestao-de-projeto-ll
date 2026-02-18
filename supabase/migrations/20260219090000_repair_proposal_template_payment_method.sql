ALTER TABLE public.proposal_templates
ADD COLUMN IF NOT EXISTS payment_method text;

DROP FUNCTION IF EXISTS public.get_proposal_by_token(text, text);

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(
  p_token text,
  p_email text DEFAULT NULL::text
)
RETURNS TABLE(
  proposal_id uuid,
  title text,
  description text,
  recipient_name text,
  recipient_email text,
  recipient_company text,
  items jsonb,
  total_hours numeric,
  total_value numeric,
  status text,
  valid_until date,
  created_at timestamp with time zone,
  template_content text,
  template_sections jsonb,
  template_payment_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient_email text;
BEGIN
  IF p_email IS NOT NULL THEN
    SELECT p.recipient_email INTO v_recipient_email
    FROM proposals p
    WHERE p.share_token = p_token;

    IF v_recipient_email IS NULL OR lower(trim(v_recipient_email)) != lower(trim(p_email)) THEN
      RETURN;
    END IF;
  END IF;

  UPDATE proposals
  SET status = 'viewed', updated_at = now()
  WHERE share_token = p_token AND proposals.status = 'sent';

  RETURN QUERY
  SELECT
    p.id AS proposal_id,
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
    p.created_at,
    pt.description AS template_content,
    pt.sections AS template_sections,
    pt.payment_method AS template_payment_method
  FROM proposals p
  LEFT JOIN proposal_templates pt ON pt.id = p.template_id
  WHERE p.share_token = p_token;
END;
$function$;

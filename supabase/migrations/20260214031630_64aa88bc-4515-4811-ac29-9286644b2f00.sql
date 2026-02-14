
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text)
 RETURNS TABLE(proposal_id uuid, title text, description text, recipient_name text, recipient_email text, recipient_company text, items jsonb, total_hours numeric, total_value numeric, status text, valid_until date, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update status to viewed if it was sent
  UPDATE proposals p
  SET status = 'viewed', updated_at = now()
  WHERE p.share_token = p_token AND p.status = 'sent';

  RETURN QUERY
  SELECT 
    p.id,
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
$function$;

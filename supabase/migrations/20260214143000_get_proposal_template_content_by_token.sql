-- Fallback RPC for environments where get_proposal_by_token does not yet return template_content
CREATE OR REPLACE FUNCTION public.get_proposal_template_content_by_token(p_token TEXT)
RETURNS TABLE (
  template_content TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.description
  FROM proposals p
  LEFT JOIN proposal_templates t ON t.id = p.template_id
  WHERE p.share_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_proposal_template_content_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_proposal_template_content_by_token(TEXT) TO authenticated;

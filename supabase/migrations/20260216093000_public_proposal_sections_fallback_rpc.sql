-- Fallback RPC for public proposal rendering: retrieves template sections by share token
-- without requiring direct table access from anonymous clients.
CREATE OR REPLACE FUNCTION public.get_proposal_template_sections_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(t.sections, '[]'::jsonb)
  FROM public.proposals p
  LEFT JOIN public.proposal_templates t ON t.id = p.template_id
  WHERE p.share_token = p_token
  LIMIT 1;
$$;

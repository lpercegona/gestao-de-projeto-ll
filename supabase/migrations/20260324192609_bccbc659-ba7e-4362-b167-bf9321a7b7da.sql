
DROP FUNCTION IF EXISTS public.get_shared_report_custom_metrics(text);

CREATE OR REPLACE FUNCTION public.get_shared_report_custom_metrics(p_token text)
 RETURNS TABLE(metric_id uuid, label text, entity_type text, category_source text, category_field_id uuid, category_value text, display_type text, sort_order integer, block_title text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS metric_id,
    m.label,
    m.entity_type,
    m.category_source,
    m.category_field_id,
    m.category_value,
    m.display_type,
    m.sort_order,
    m.block_title
  FROM report_custom_metrics m
  JOIN report_shares rs ON rs.client_id = m.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true
  ORDER BY m.sort_order ASC;
END;
$function$;

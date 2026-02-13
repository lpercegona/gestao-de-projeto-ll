-- Permite edição inline segura de dados da empresa/contrato sem reabrir policy ampla de UPDATE
CREATE OR REPLACE FUNCTION public.update_client_company_settings(
  p_client_id uuid,
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_contract_type text,
  p_contracted_hours numeric,
  p_contract_start_date date,
  p_contract_end_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_master_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = p_client_id
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = p_client_id
        AND c.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar este cliente';
  END IF;

  UPDATE public.clients
  SET
    name = COALESCE(p_name, name),
    company = p_company,
    email = COALESCE(p_email, email),
    phone = p_phone,
    contract_type = CASE
      WHEN p_contract_type IN ('one_time', 'monthly') THEN p_contract_type
      ELSE contract_type
    END,
    contracted_hours = COALESCE(p_contracted_hours, contracted_hours),
    contract_start_date = p_contract_start_date,
    contract_end_date = p_contract_end_date,
    updated_at = now()
  WHERE id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_client_company_settings(uuid, text, text, text, text, text, numeric, date, date) TO authenticated;

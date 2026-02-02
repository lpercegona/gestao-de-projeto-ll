-- Adicionar coluna de tipo de contrato à tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'one_time';

-- Adicionar campos de período do contrato
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_months INTEGER DEFAULT 1;

-- Criar tabela de histórico mensal para snapshots
CREATE TABLE IF NOT EXISTS client_hours_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  contracted_hours INTEGER NOT NULL,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, period_year, period_month)
);

-- Habilitar RLS na tabela de histórico
ALTER TABLE client_hours_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_hours_history
CREATE POLICY "Admin can manage own client hours history"
ON client_hours_history
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_hours_history.client_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Master admin can manage all hours history"
ON client_hours_history
FOR ALL
USING (is_master_admin(auth.uid()));

CREATE POLICY "Clients can view own hours history"
ON client_hours_history
FOR SELECT
USING (
  has_role(auth.uid(), 'client'::app_role) AND 
  client_id = get_user_client_id(auth.uid())
);

-- Atualizar a função get_shared_report para incluir os novos campos
DROP FUNCTION IF EXISTS public.get_shared_report(text);

CREATE OR REPLACE FUNCTION public.get_shared_report(p_token text)
RETURNS TABLE(
  client_id uuid, 
  client_name text, 
  client_company text, 
  client_logo_url text, 
  contracted_hours integer, 
  contract_type text,
  contract_start_date date,
  contract_end_date date,
  contract_months integer,
  is_public boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.company as client_company,
    c.logo_url as client_logo_url,
    c.contracted_hours,
    c.contract_type,
    c.contract_start_date,
    c.contract_end_date,
    c.contract_months,
    rs.is_public
  FROM report_shares rs
  JOIN clients c ON c.id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true;
END;
$function$;
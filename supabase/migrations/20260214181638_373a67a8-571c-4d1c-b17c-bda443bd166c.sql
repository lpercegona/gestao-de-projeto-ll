
-- 1. Add missing columns to task_timers
ALTER TABLE public.task_timers
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_title_snapshot text,
  ADD COLUMN IF NOT EXISTS task_description_snapshot text,
  ADD COLUMN IF NOT EXISTS project_name_snapshot text,
  ADD COLUMN IF NOT EXISTS client_name_snapshot text;

-- 2. Add missing columns to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS identity_guidelines text,
  ADD COLUMN IF NOT EXISTS identity_attachments jsonb DEFAULT '[]'::jsonb;

-- 3. Create bucket client-identity-files
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-identity-files', 'client-identity-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-identity-files
CREATE POLICY "Public read access for client identity files"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-identity-files');

CREATE POLICY "Authenticated users can upload client identity files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-identity-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update own client identity files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-identity-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete own client identity files"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-identity-files' AND auth.uid() IS NOT NULL);

-- 4. Create RPC update_client_company_settings
CREATE OR REPLACE FUNCTION public.update_client_company_settings(
  p_client_id uuid,
  p_name text,
  p_company text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_contract_type text DEFAULT 'one_time',
  p_contracted_hours integer DEFAULT 0,
  p_contract_start_date date DEFAULT NULL,
  p_contract_end_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_client_user_id uuid;
BEGIN
  -- Verify the calling user is linked to this client
  SELECT cu.user_id INTO v_client_user_id
  FROM client_users cu
  WHERE cu.client_id = p_client_id AND cu.user_id = v_user_id;

  IF v_client_user_id IS NULL THEN
    -- Also check legacy clients.user_id
    IF NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = p_client_id AND c.user_id = v_user_id) THEN
      RAISE EXCEPTION 'Not authorized to update this client';
    END IF;
  END IF;

  UPDATE clients
  SET
    name = COALESCE(p_name, name),
    company = p_company,
    email = COALESCE(p_email, email),
    phone = p_phone,
    contract_type = COALESCE(p_contract_type, contract_type),
    contracted_hours = COALESCE(p_contracted_hours, contracted_hours),
    contract_start_date = p_contract_start_date,
    contract_end_date = p_contract_end_date,
    updated_at = now()
  WHERE id = p_client_id;
END;
$$;

-- 5. Create RPC update_client_identity_settings
CREATE OR REPLACE FUNCTION public.update_client_identity_settings(
  p_client_id uuid,
  p_identity_guidelines text DEFAULT NULL,
  p_identity_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Verify the calling user is linked to this client
  IF NOT EXISTS (
    SELECT 1 FROM client_users cu WHERE cu.client_id = p_client_id AND cu.user_id = v_user_id
    UNION ALL
    SELECT 1 FROM clients c WHERE c.id = p_client_id AND c.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this client';
  END IF;

  UPDATE clients
  SET
    identity_guidelines = p_identity_guidelines,
    identity_attachments = COALESCE(p_identity_attachments, '[]'::jsonb),
    updated_at = now()
  WHERE id = p_client_id;
END;
$$;

-- 6. Update get_proposal_by_token to require email validation
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text, p_email text DEFAULT NULL)
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
  created_at timestamptz,
  template_content text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_email text;
BEGIN
  -- If p_email is provided, verify it matches the proposal recipient
  IF p_email IS NOT NULL THEN
    SELECT p.recipient_email INTO v_recipient_email
    FROM proposals p
    WHERE p.share_token = p_token;

    IF v_recipient_email IS NULL OR lower(trim(v_recipient_email)) != lower(trim(p_email)) THEN
      -- Return empty result set
      RETURN;
    END IF;
  END IF;

  -- Update status to viewed if currently sent
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
    pt.description AS template_content
  FROM proposals p
  LEFT JOIN proposal_templates pt ON pt.id = p.template_id
  WHERE p.share_token = p_token;
END;
$$;

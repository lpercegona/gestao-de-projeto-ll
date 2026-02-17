-- Backfill proposal ownership to avoid RLS failures on updates (e.g. share_static_html writes)
-- and ensure sent-proposal client sync propagates a valid owner.

-- 1) Backfill proposals.owner_id from created_by when missing.
WITH updated AS (
  UPDATE public.proposals
  SET owner_id = created_by
  WHERE owner_id IS NULL
    AND created_by IS NOT NULL
  RETURNING id
)
SELECT count(*) AS backfilled_proposals
FROM updated;

-- 2) Optional inspection for manual handling: proposals still missing both owner_id and created_by.
SELECT id, proposal_number, recipient_email, created_at
FROM public.proposals
WHERE owner_id IS NULL
  AND created_by IS NULL
ORDER BY created_at DESC;

-- 3) Harden trigger logic so owner propagation works even when owner_id was not explicitly set.
CREATE OR REPLACE FUNCTION public.sync_client_from_sent_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_items JSONB := COALESCE(NEW.items, '[]'::jsonb);
  v_total_hours INTEGER := 0;
  v_contract_type TEXT := 'one_time';
  v_effective_owner_id UUID := COALESCE(NEW.owner_id, NEW.created_by);
BEGIN
  IF NEW.status <> 'sent' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    SUM(
      CASE
        WHEN jsonb_typeof(item->'hours') = 'number' THEN (item->>'hours')::numeric
        WHEN COALESCE(item->>'hours', '') ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN REPLACE(item->>'hours', ',', '.')::numeric
        ELSE 0
      END
    ),
    0
  )::integer
  INTO v_total_hours
  FROM jsonb_array_elements(v_items) AS item;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_items) AS item
    WHERE lower(COALESCE(item->>'billingType', item->>'billing_type', 'unique')) = 'monthly'
  ) THEN
    v_contract_type := 'monthly';
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    v_client_id := NEW.client_id;
  ELSE
    SELECT c.id
    INTO v_client_id
    FROM public.clients c
    WHERE lower(c.email) = lower(NEW.recipient_email)
      AND c.owner_id IS NOT DISTINCT FROM v_effective_owner_id
    ORDER BY c.updated_at DESC
    LIMIT 1;

    IF v_client_id IS NULL THEN
      INSERT INTO public.clients (
        name,
        email,
        company,
        contracted_hours,
        contract_type,
        pipeline_status,
        source,
        proposal_service_items,
        owner_id,
        created_by
      )
      VALUES (
        NEW.recipient_name,
        NEW.recipient_email,
        NEW.recipient_company,
        GREATEST(v_total_hours, 0),
        v_contract_type,
        'proposal',
        'proposal',
        v_items,
        v_effective_owner_id,
        NEW.created_by
      )
      RETURNING id INTO v_client_id;
    END IF;
  END IF;

  UPDATE public.clients
  SET
    name = COALESCE(NULLIF(NEW.recipient_name, ''), name),
    email = COALESCE(NULLIF(NEW.recipient_email, ''), email),
    company = COALESCE(NULLIF(NEW.recipient_company, ''), company),
    contracted_hours = GREATEST(COALESCE(contracted_hours, 0), GREATEST(v_total_hours, 0)),
    contract_type = CASE WHEN v_contract_type = 'monthly' THEN 'monthly' ELSE COALESCE(contract_type, 'one_time') END,
    pipeline_status = CASE
      WHEN COALESCE(pipeline_status, 'lead') IN ('active', 'churned') THEN pipeline_status
      ELSE 'proposal'
    END,
    source = COALESCE(source, 'proposal'),
    proposal_service_items = v_items,
    owner_id = COALESCE(owner_id, v_effective_owner_id),
    created_by = COALESCE(created_by, NEW.created_by),
    updated_at = now()
  WHERE id = v_client_id;

  UPDATE public.proposals
  SET client_id = v_client_id
  WHERE id = NEW.id
    AND (client_id IS NULL OR client_id IS DISTINCT FROM v_client_id);

  RETURN NEW;
END;
$$;

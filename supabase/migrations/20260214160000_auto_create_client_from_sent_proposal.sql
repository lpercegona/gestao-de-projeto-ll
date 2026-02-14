-- Auto-create/link client profile when a proposal is sent
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS proposal_service_items JSONB NOT NULL DEFAULT '[]'::jsonb;

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
      AND c.owner_id IS NOT DISTINCT FROM NEW.owner_id
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
        NEW.owner_id,
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
    owner_id = COALESCE(owner_id, NEW.owner_id),
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

DROP TRIGGER IF EXISTS trigger_sync_client_from_sent_proposal_insert ON public.proposals;
CREATE TRIGGER trigger_sync_client_from_sent_proposal_insert
AFTER INSERT
ON public.proposals
FOR EACH ROW
WHEN (NEW.status = 'sent')
EXECUTE FUNCTION public.sync_client_from_sent_proposal();

DROP TRIGGER IF EXISTS trigger_sync_client_from_sent_proposal_update ON public.proposals;
CREATE TRIGGER trigger_sync_client_from_sent_proposal_update
AFTER UPDATE OF status
ON public.proposals
FOR EACH ROW
WHEN (NEW.status = 'sent' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.sync_client_from_sent_proposal();

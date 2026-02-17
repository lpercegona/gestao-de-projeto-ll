-- Reduce recurrence of proposals without owner_id by filling it automatically.
-- Priority:
-- 1) keep explicit owner_id if provided
-- 2) fallback to created_by
-- 3) fallback to auth.uid() when available

CREATE OR REPLACE FUNCTION public.ensure_proposal_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_id := COALESCE(NEW.owner_id, NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_proposal_owner_id ON public.proposals;

CREATE TRIGGER trigger_ensure_proposal_owner_id
BEFORE INSERT OR UPDATE OF owner_id, created_by
ON public.proposals
FOR EACH ROW
WHEN (NEW.owner_id IS NULL)
EXECUTE FUNCTION public.ensure_proposal_owner_id();

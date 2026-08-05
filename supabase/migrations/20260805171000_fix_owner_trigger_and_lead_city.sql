-- Fix enforce_crm_owner: only enforce for authenticated users with a session.
-- SQL Editor / migrations / service role have auth.uid() IS NULL and must not be blocked.
-- Also allow superadmins fully; non-super must have a linked team_members seat.

CREATE OR REPLACE FUNCTION public.enforce_crm_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID;
  super BOOLEAN;
BEGIN
  -- No JWT / dashboard SQL / migrations: do not force owner checks
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  me := public.current_team_member_id();
  super := public.is_super_admin();

  IF TG_OP = 'INSERT' THEN
    IF super THEN
      IF NEW.owner_id IS NULL THEN
        IF me IS NULL THEN
          RAISE EXCEPTION 'Cannot insert CRM row: no team member linked to this auth user';
        END IF;
        NEW.owner_id := me;
      END IF;
    ELSE
      IF me IS NULL THEN
        RAISE EXCEPTION 'Cannot insert CRM row: profile is not linked to a team_members row';
      END IF;
      NEW.owner_id := me;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT super THEN
      IF me IS NULL THEN
        RAISE EXCEPTION 'Cannot update CRM row: profile is not linked to a team_members row';
      END IF;
      NEW.owner_id := OLD.owner_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Lead city / location type (safe after trigger fix)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS location_type TEXT;

-- Temporarily drop trigger so backfill never depends on JWT (belt-and-suspenders)
DROP TRIGGER IF EXISTS enforce_crm_owner_trg ON public.leads;

UPDATE public.leads
SET location_type = 'hq'
WHERE location_type IS NULL OR btrim(location_type) = '';

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_location_type_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_location_type_check CHECK (
    location_type IS NULL OR location_type IN ('hq', 'branch')
  );

ALTER TABLE public.leads
  ALTER COLUMN location_type SET DEFAULT 'hq';

-- Restore owner enforce trigger on leads
CREATE TRIGGER enforce_crm_owner_trg
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_owner();

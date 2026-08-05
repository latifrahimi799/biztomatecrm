-- Convert leads.status from enum lead_status → text with pipeline values.
-- Idempotent; safe to re-run. Temporarily drops owner trigger to avoid auth session issues.

DROP TRIGGER IF EXISTS enforce_crm_owner_trg ON public.leads;

ALTER TABLE public.leads
  ALTER COLUMN status DROP DEFAULT;

-- If still enum, cast to text; if already text, no-op cast
ALTER TABLE public.leads
  ALTER COLUMN status TYPE text USING status::text;

UPDATE public.leads
SET status = CASE status
  WHEN 'new' THEN 'dm'
  WHEN 'working' THEN 'presentation'
  WHEN 'nurturing' THEN 'stuck_gatekeeper'
  WHEN 'qualified' THEN 'consultation_booked'
  WHEN 'converted' THEN 'sold'
  WHEN 'disqualified' THEN 'invalid_lead'
  ELSE status
END;

UPDATE public.leads
SET status = 'dm'
WHERE status IS NULL
   OR status NOT IN (
     'dm',
     'stuck_gatekeeper',
     'presentation',
     'not_interested',
     'consultation_booked',
     'sold',
     'invalid_lead'
   );

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check CHECK (
    status IN (
      'dm',
      'stuck_gatekeeper',
      'presentation',
      'not_interested',
      'consultation_booked',
      'sold',
      'invalid_lead'
    )
  );

ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'dm';

-- Restore owner trigger (function should already allow auth.uid() IS NULL)
CREATE TRIGGER enforce_crm_owner_trg
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_owner();

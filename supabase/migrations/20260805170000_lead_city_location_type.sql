-- Lead city / location type for filtering (HQ vs Branch)
-- Prefer 20260805171000_fix_owner_trigger_and_lead_city.sql if the owner trigger blocks updates.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS location_type TEXT;

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

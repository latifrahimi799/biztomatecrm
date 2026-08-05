-- Extra contact fields on leads: multiple phones/emails + website

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS emails TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phones TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS website TEXT;

-- Backfill from single email / phone columns
UPDATE public.leads
SET emails = CASE
  WHEN emails = '{}' AND email IS NOT NULL AND btrim(email) <> '' THEN ARRAY[btrim(email)]
  ELSE emails
END;

UPDATE public.leads
SET phones = CASE
  WHEN phones = '{}' AND phone IS NOT NULL AND btrim(phone) <> '' THEN ARRAY[btrim(phone)]
  ELSE phones
END;

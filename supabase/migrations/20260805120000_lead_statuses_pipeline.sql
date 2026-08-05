-- Lead pipeline statuses (biz workflow). status becomes free text with allowed values.

ALTER TABLE public.leads
  ALTER COLUMN status DROP DEFAULT;

-- Drop enum dependency (Postgres cannot easily drop enum values in place)
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

-- Normalize any remaining unknown values
UPDATE public.leads
SET status = 'dm'
WHERE status NOT IN (
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

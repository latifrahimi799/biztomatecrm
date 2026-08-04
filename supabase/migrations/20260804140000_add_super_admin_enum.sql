-- STEP 1 of 2 — run this alone first, then run 20260804140001_...
-- Postgres requires a new enum value to be committed before it can be used.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'team_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.team_role ADD VALUE 'super_admin';
  END IF;
END $$;

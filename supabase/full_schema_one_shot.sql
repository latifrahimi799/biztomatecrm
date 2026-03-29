-- ============================================================================
-- Biztomate CRM — full Postgres schema (Supabase) in one script
-- ============================================================================
-- Safe to re-run: skips enum types / tables that already exist (e.g. after
-- running migrations). Dashboard → SQL → New query → Run.
-- This defines TABLES + storage bucket policies + template blocks column.
-- It does NOT copy Zustand/localStorage data; you still load rows via INSERT
-- or by wiring the app to Supabase (see column map below).
--
-- App (camelCase) → Postgres (snake_case)
--   Company.ownerId          → companies.owner_id  (UUID → team_members.id)
--   Contact.*                → contacts.*
--   Deal.contactIds[]        → deal_contacts (deal_id, contact_id)
--   Activity.*               → activities.*
--   Lead.*                   → leads.*
--   Product.*                → products.*
--   Quote.lines[]            → quote_lines
--   TeamMember               → team_members
--   EmailTemplate.bodyFormat → email_templates.body_format ('html' | 'blocks')
--   EmailTemplate.blocks     → email_templates.blocks (jsonb)
--   Campaign.contactIds      → campaign_members (member_type='contact')
--   Campaign.leadIds         → campaign_members (member_type='lead')
--
-- Every owner_id must reference an existing team_members row first.
-- Primary keys are UUID (use crypto.randomUUID() in the app when syncing).
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== Enums (idempotent) ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'deal_stage'
  ) THEN
    CREATE TYPE public.deal_stage AS ENUM (
      'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'activity_type'
  ) THEN
    CREATE TYPE public.activity_type AS ENUM (
      'task', 'call', 'meeting', 'email', 'note'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'lead_status'
  ) THEN
    CREATE TYPE public.lead_status AS ENUM (
      'new', 'working', 'nurturing', 'qualified', 'disqualified', 'converted'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'contact_lifecycle'
  ) THEN
    CREATE TYPE public.contact_lifecycle AS ENUM (
      'subscriber', 'lead', 'customer', 'churned'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'quote_status'
  ) THEN
    CREATE TYPE public.quote_status AS ENUM (
      'draft', 'sent', 'accepted', 'rejected', 'expired'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'team_role'
  ) THEN
    CREATE TYPE public.team_role AS ENUM (
      'admin', 'sales', 'marketing', 'support'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'campaign_type'
  ) THEN
    CREATE TYPE public.campaign_type AS ENUM (
      'email', 'webinar', 'trade_show', 'advertisement', 'conference', 'referral', 'other'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'campaign_status'
  ) THEN
    CREATE TYPE public.campaign_status AS ENUM (
      'planning', 'active', 'completed', 'cancelled'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'email_template_category'
  ) THEN
    CREATE TYPE public.email_template_category AS ENUM (
      'campaign', 'general'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'related_entity_type'
  ) THEN
    CREATE TYPE public.related_entity_type AS ENUM (
      'contact', 'company', 'deal'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'campaign_member_type'
  ) THEN
    CREATE TYPE public.campaign_member_type AS ENUM (
      'contact', 'lead'
    );
  END IF;
END $$;

-- ========== Team ==========
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'sales',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members (id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Core CRM ==========
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  employee_count TEXT,
  address TEXT,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  job_title TEXT,
  company_id UUID REFERENCES companies (id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT '',
  lifecycle contact_lifecycle NOT NULL DEFAULT 'lead',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (lower(email));

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies (id) ON DELETE SET NULL,
  stage deal_stage NOT NULL DEFAULT 'lead',
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  probability INT NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_contacts (
  deal_id UUID NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, contact_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type activity_type NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  related_type related_entity_type,
  related_id UUID,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_related ON activities (related_type, related_id);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  score INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  deal_id UUID REFERENCES deals (id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies (id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts (id) ON DELETE SET NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  discount_pct NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (quote_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines (quote_id);

-- ========== Marketing ==========
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category email_template_category NOT NULL DEFAULT 'general',
  active BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type campaign_type NOT NULL,
  status campaign_status NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  budgeted_cost NUMERIC,
  actual_cost NUMERIC,
  expected_revenue NUMERIC,
  currency TEXT NOT NULL DEFAULT 'CAD',
  description TEXT,
  template_id UUID REFERENCES email_templates (id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES team_members (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_members (
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  member_type campaign_member_type NOT NULL,
  member_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, member_type, member_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_members_member ON campaign_members (member_type, member_id);

-- Block / HTML modes (same as migration 20260328120000)
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'html';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_templates_body_format_check'
  ) THEN
    ALTER TABLE email_templates
      ADD CONSTRAINT email_templates_body_format_check
      CHECK (body_format IN ('html', 'blocks'));
  END IF;
END $$;

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS blocks jsonb;

-- ========== Updated-at triggers ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_companies_updated ON companies;
CREATE TRIGGER tr_companies_updated BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_contacts_updated ON contacts;
CREATE TRIGGER tr_contacts_updated BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_deals_updated ON deals;
CREATE TRIGGER tr_deals_updated BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_leads_updated ON leads;
CREATE TRIGGER tr_leads_updated BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_quotes_updated ON quotes;
CREATE TRIGGER tr_quotes_updated BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_team_members_updated ON team_members;
CREATE TRIGGER tr_team_members_updated BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_email_templates_updated ON email_templates;
CREATE TRIGGER tr_email_templates_updated BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_campaigns_updated ON campaigns;
CREATE TRIGGER tr_campaigns_updated BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tr_profiles_updated ON profiles;
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== Storage: email template images ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-template-assets',
  'email-template-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "email_assets_public_read" ON storage.objects;
CREATE POLICY "email_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-template-assets');

DROP POLICY IF EXISTS "email_assets_authenticated_insert" ON storage.objects;
CREATE POLICY "email_assets_authenticated_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'email-template-assets');

DROP POLICY IF EXISTS "email_assets_authenticated_update" ON storage.objects;
CREATE POLICY "email_assets_authenticated_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'email-template-assets');

DROP POLICY IF EXISTS "email_assets_authenticated_delete" ON storage.objects;
CREATE POLICY "email_assets_authenticated_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'email-template-assets');

DROP POLICY IF EXISTS "email_assets_anon_insert" ON storage.objects;
CREATE POLICY "email_assets_anon_insert"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'email-template-assets');

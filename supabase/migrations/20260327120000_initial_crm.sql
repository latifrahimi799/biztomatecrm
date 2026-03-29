-- Biztomate CRM — initial schema aligned with the React app (local Zustand types).
-- Apply with: supabase db push  OR  paste into SQL editor in Supabase Dashboard.
-- IDs are UUIDs (matches crypto.randomUUID() in the browser).

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== Enums ==========
CREATE TYPE deal_stage AS ENUM (
  'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
);

CREATE TYPE activity_type AS ENUM (
  'task', 'call', 'meeting', 'email', 'note'
);

CREATE TYPE lead_status AS ENUM (
  'new', 'working', 'nurturing', 'qualified', 'disqualified', 'converted'
);

CREATE TYPE contact_lifecycle AS ENUM (
  'subscriber', 'lead', 'customer', 'churned'
);

CREATE TYPE quote_status AS ENUM (
  'draft', 'sent', 'accepted', 'rejected', 'expired'
);

CREATE TYPE team_role AS ENUM (
  'admin', 'sales', 'marketing', 'support'
);

CREATE TYPE campaign_type AS ENUM (
  'email', 'webinar', 'trade_show', 'advertisement', 'conference', 'referral', 'other'
);

CREATE TYPE campaign_status AS ENUM (
  'planning', 'active', 'completed', 'cancelled'
);

CREATE TYPE email_template_category AS ENUM (
  'campaign', 'general'
);

CREATE TYPE related_entity_type AS ENUM (
  'contact', 'company', 'deal'
);

CREATE TYPE campaign_member_type AS ENUM (
  'contact', 'lead'
);

-- ========== Team (maps TeamMember in app) ==========
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'sales',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: link CRM users to Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members (id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Core CRM ==========
CREATE TABLE companies (
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

CREATE TABLE contacts (
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

CREATE INDEX idx_contacts_company ON contacts (company_id);
CREATE INDEX idx_contacts_email ON contacts (lower(email));

CREATE TABLE deals (
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

CREATE TABLE deal_contacts (
  deal_id UUID NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, contact_id)
);

CREATE TABLE activities (
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

CREATE INDEX idx_activities_related ON activities (related_type, related_id);

CREATE TABLE leads (
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

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotes (
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

CREATE TABLE quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  discount_pct NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (quote_id, product_id)
);

CREATE INDEX idx_quote_lines_quote ON quote_lines (quote_id);

-- ========== Marketing (Zoho-style) ==========
CREATE TABLE email_templates (
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

CREATE TABLE campaigns (
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

CREATE TABLE campaign_members (
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  member_type campaign_member_type NOT NULL,
  member_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, member_type, member_id)
);

CREATE INDEX idx_campaign_members_member ON campaign_members (member_type, member_id);

-- ========== Updated-at triggers ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_companies_updated BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_contacts_updated BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_deals_updated BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_leads_updated BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_quotes_updated BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_team_members_updated BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_email_templates_updated BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_campaigns_updated BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== Row Level Security (enable when integrating auth) ==========
-- Example: collaborators see rows owned by their team_member_id or org.
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "companies_rw" ON companies FOR ALL TO authenticated
--   USING (true) WITH CHECK (true);
--
-- Start locked down in production; use service role only from your backend when needed.

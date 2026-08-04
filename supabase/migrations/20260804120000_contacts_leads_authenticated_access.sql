-- Allow signed-in users to read/write CRM people tables.
-- Apply in Supabase SQL Editor or: supabase db push (after linking the project).

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_authenticated_all" ON public.team_members;
CREATE POLICY "team_members_authenticated_all"
  ON public.team_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "companies_authenticated_all" ON public.companies;
CREATE POLICY "companies_authenticated_all"
  ON public.companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "contacts_authenticated_all" ON public.contacts;
CREATE POLICY "contacts_authenticated_all"
  ON public.contacts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "leads_authenticated_all" ON public.leads;
CREATE POLICY "leads_authenticated_all"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

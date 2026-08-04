-- STEP 2 of 2 — run AFTER 20260804140000_add_super_admin_enum.sql has completed successfully.
-- RBAC: Super Admin sees all; others only rows where owner_id = their team_members.id.

-- Security helpers
CREATE OR REPLACE FUNCTION public.current_team_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_member_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.team_members t ON t.id = p.team_member_id
    WHERE p.id = auth.uid()
      AND t.role::text = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_team_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_super" ON public.profiles;
CREATE POLICY "profiles_select_own_or_super"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Owner-scoped CRM tables
DO $$
DECLARE
  t text;
  owned text[] := ARRAY[
    'companies', 'contacts', 'leads', 'deals', 'activities',
    'quotes', 'email_templates', 'campaigns'
  ];
BEGIN
  FOREACH t IN ARRAY owned
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
       USING (public.is_super_admin() OR owner_id = public.current_team_member_id())',
      t || '_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
       WITH CHECK (public.is_super_admin() OR owner_id = public.current_team_member_id())',
      t || '_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
       USING (public.is_super_admin() OR owner_id = public.current_team_member_id())
       WITH CHECK (public.is_super_admin() OR owner_id = public.current_team_member_id())',
      t || '_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
       USING (public.is_super_admin() OR owner_id = public.current_team_member_id())',
      t || '_delete', t
    );
  END LOOP;
END $$;

-- Junction tables follow parent ownership
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deal_contacts_authenticated_all" ON public.deal_contacts;
DROP POLICY IF EXISTS "deal_contacts_all" ON public.deal_contacts;
CREATE POLICY "deal_contacts_all" ON public.deal_contacts FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id AND d.owner_id = public.current_team_member_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id AND d.owner_id = public.current_team_member_id()
    )
  );

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_lines_authenticated_all" ON public.quote_lines;
DROP POLICY IF EXISTS "quote_lines_all" ON public.quote_lines;
CREATE POLICY "quote_lines_all" ON public.quote_lines FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id AND q.owner_id = public.current_team_member_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id AND q.owner_id = public.current_team_member_id()
    )
  );

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_members_authenticated_all" ON public.campaign_members;
DROP POLICY IF EXISTS "campaign_members_all" ON public.campaign_members;
CREATE POLICY "campaign_members_all" ON public.campaign_members FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = public.current_team_member_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = public.current_team_member_id()
    )
  );

-- Products: shared catalog
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_authenticated_all" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (public.is_super_admin());

-- Team members roster
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_authenticated_all" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.current_team_member_id() IS NULL);
CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- Bootstrap: earliest team member becomes super_admin if none exists
-- (Safe only after enum value from step 1 has been committed.)
UPDATE public.team_members
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM public.team_members ORDER BY created_at ASC NULLS LAST LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.team_members WHERE role::text = 'super_admin'
);

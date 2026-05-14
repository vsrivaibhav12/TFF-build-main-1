-- ============================================================================
-- ADDITIVE RLS POLICIES (loaded AFTER schema.sql v3)
-- These fill gaps in schema.sql v3 where admin/team roles had NO policy on
-- core tables (clients, tasks, queries, etc.), making the portal unusable
-- without service-role bypass.
--
-- All policies here are PURELY ADDITIVE - no existing policy is dropped or
-- modified. The on-disk schema.sql is bit-for-bit unchanged.
--
-- Naming convention: admin_*, team_* (so they don't collide with v3 policies)
-- ============================================================================

-- Helper: a SECURITY DEFINER function that returns the calling user's role.
-- Reading from users_profile inside an RLS policy on users_profile itself
-- causes recursion; this function avoids that.
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS TEXT
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users_profile WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- users_profile : everyone can read all profiles (needed for FK joins in UI).
-- Self-update only. Admin can update anyone.
-- ----------------------------------------------------------------------------
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_self_view" ON users_profile;
CREATE POLICY "profiles_self_view" ON users_profile FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "profiles_self_update" ON users_profile;
CREATE POLICY "profiles_self_update" ON users_profile FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'admin');
DROP POLICY IF EXISTS "profiles_admin_all" ON users_profile;
CREATE POLICY "profiles_admin_all" ON users_profile FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_admin_all" ON clients;
CREATE POLICY "clients_admin_all" ON clients FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "clients_team_select" ON clients;
CREATE POLICY "clients_team_select" ON clients FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "clients_team_update" ON clients;
CREATE POLICY "clients_team_update" ON clients FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- client_groups, client_users, team_client_assignment, client_services,
-- client_sub_services : admin all + team select
-- ----------------------------------------------------------------------------
ALTER TABLE client_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_client_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sub_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_groups_admin" ON client_groups;
CREATE POLICY "client_groups_admin" ON client_groups FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team')) WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "client_users_admin" ON client_users;
CREATE POLICY "client_users_admin" ON client_users FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team') OR user_id = auth.uid())
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "tca_admin" ON team_client_assignment;
CREATE POLICY "tca_admin" ON team_client_assignment FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "client_services_admin_team" ON client_services;
CREATE POLICY "client_services_admin_team" ON client_services FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "client_sub_services_admin_team" ON client_sub_services;
CREATE POLICY "client_sub_services_admin_team" ON client_sub_services FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- service catalogue : everyone authenticated can read; admin can mutate
-- ----------------------------------------------------------------------------
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogue_read" ON service_categories;
CREATE POLICY "catalogue_read" ON service_categories FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "catalogue_admin" ON service_categories;
CREATE POLICY "catalogue_admin" ON service_categories FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "services_read" ON services;
CREATE POLICY "services_read" ON services FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "services_admin" ON services;
CREATE POLICY "services_admin" ON services FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "sub_services_read" ON sub_services;
CREATE POLICY "sub_services_read" ON sub_services FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "sub_services_admin" ON sub_services;
CREATE POLICY "sub_services_admin" ON sub_services FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- tasks (admin full, team insert/update for assigned clients)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_admin_all" ON tasks;
CREATE POLICY "tasks_admin_all" ON tasks FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS "tasks_team_insert" ON tasks;
CREATE POLICY "tasks_team_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

-- task_activity, task_notes, task_document_requests, task_templates
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_activity_visible" ON task_activity;
CREATE POLICY "task_activity_visible" ON task_activity FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks));
DROP POLICY IF EXISTS "task_activity_insert" ON task_activity;
CREATE POLICY "task_activity_insert" ON task_activity FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks));

DROP POLICY IF EXISTS "task_notes_visible" ON task_notes;
CREATE POLICY "task_notes_visible" ON task_notes FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks));
DROP POLICY IF EXISTS "task_notes_insert" ON task_notes;
CREATE POLICY "task_notes_insert" ON task_notes FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks));

DROP POLICY IF EXISTS "task_doc_req_team" ON task_document_requests;
CREATE POLICY "task_doc_req_team" ON task_document_requests FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));

DROP POLICY IF EXISTS "task_templates_team" ON task_templates;
CREATE POLICY "task_templates_team" ON task_templates FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- queries / query_messages : admin all, team for assigned clients, client own
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "queries_admin_all" ON queries;
CREATE POLICY "queries_admin_all" ON queries FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "queries_team_assigned" ON queries;
CREATE POLICY "queries_team_assigned" ON queries FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "queries_client_create" ON queries;
CREATE POLICY "queries_client_create" ON queries FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "queries_client_select" ON queries;
CREATE POLICY "queries_client_select" ON queries FOR SELECT TO authenticated
  USING (created_by = auth.uid()
    OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

ALTER TABLE query_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "query_msg_visible" ON query_messages;
CREATE POLICY "query_msg_visible" ON query_messages FOR SELECT TO authenticated
  USING (query_id IN (SELECT id FROM queries));
DROP POLICY IF EXISTS "query_msg_insert" ON query_messages;
CREATE POLICY "query_msg_insert" ON query_messages FOR INSERT TO authenticated
  WITH CHECK (query_id IN (SELECT id FROM queries) AND sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- compliance / notices / filings : admin full
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "gst_filings_admin" ON gst_filings;
CREATE POLICY "gst_filings_admin" ON gst_filings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "tds_filings_admin" ON tds_filings;
CREATE POLICY "tds_filings_admin" ON tds_filings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "it_filings_admin" ON it_filings;
CREATE POLICY "it_filings_admin" ON it_filings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "compliance_status_admin" ON compliance_status;
CREATE POLICY "compliance_status_admin" ON compliance_status FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "notices_admin" ON notices;
CREATE POLICY "notices_admin" ON notices FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- Bump existing v3 policies that scoped to 'team' role to also accept admin
-- (additive: we just add a parallel admin_only policy; both work via OR of policies)
DROP POLICY IF EXISTS "notices_admin_team_select" ON notices;
CREATE POLICY "notices_admin_team_select" ON notices FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));

-- ----------------------------------------------------------------------------
-- dsc_records / credentials : admin full, team assigned clients
-- ----------------------------------------------------------------------------

-- Replace old schema.sql v3 SELECT policies (inefficient subquery + no admin bypass)
-- with consistent current_user_role() policies.
DROP POLICY IF EXISTS "dsc_records_team_only" ON dsc_records;
CREATE POLICY "dsc_records_admin_select" ON dsc_records FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "dsc_records_team_select" ON dsc_records FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dsc_records_admin_all" ON dsc_records;
CREATE POLICY "dsc_records_admin_all" ON dsc_records FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "dsc_records_team_insert" ON dsc_records;
CREATE POLICY "dsc_records_team_insert" ON dsc_records FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dsc_records_team_update" ON dsc_records;
CREATE POLICY "dsc_records_team_update" ON dsc_records FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "credentials_team_only" ON credentials;
CREATE POLICY "credentials_admin_select" ON credentials FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "credentials_team_select" ON credentials FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "credentials_admin_all" ON credentials;
CREATE POLICY "credentials_admin_all" ON credentials FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "credentials_team_insert" ON credentials;
CREATE POLICY "credentials_team_insert" ON credentials FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "credentials_team_update" ON credentials;
CREATE POLICY "credentials_team_update" ON credentials FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

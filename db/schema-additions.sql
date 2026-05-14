-- ============================================================================
-- THE FISCAL FULCRUM — SCHEMA ADDITIONS (v3.1)
-- ============================================================================
--
-- Date:   May 8, 2026
-- Status: Additive only. The base schema.sql v3 is unchanged on disk.
-- Apply:  AFTER schema.sql + db/rls-additive.sql, via Management API
--         (extend scripts/apply-schema.ts or add a new
--         scripts/apply-schema-additions.ts).
--
-- v3.1 adds three tables and their RLS policies:
--   1. staff_capabilities       — RBAC capability layer (per-staff named rights)
--   2. client_portal_visibility — granular per-client portal module toggle
--   3. notification_preferences — per-user email digest cadence
--
-- All three tables ALTER ENABLE ROW LEVEL SECURITY and have explicit policies.
-- All three reference the public.current_user_role() helper from
-- db/rls-additive.sql (must be applied first).
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STAFF CAPABILITIES (RBAC)
-- ----------------------------------------------------------------------------
-- Closed list of capabilities (v1) — see NEXTJS_BACKEND_ARCHITECTURE.md
-- §Capability layer. admin role implicitly holds all; team holds none by
-- default. Application code uses requireCapability(userId, capability).
--
-- Capability strings (~25, do not invent new ones without journaling):
--   clients.read.all, clients.create, clients.edit, clients.delete,
--   clients.assign_team, clients.toggle_portal,
--   services.manage, services.assign,
--   staff.manage, staff.grant_capabilities,
--   dsc.manage, credentials.manage,
--   tasks.assign, tasks.complete,
--   compliance.enter, notices.manage,
--   bizlens.enter, vcfo.enter,
--   payroll.run,
--   attendance.approve, leave.approve,
--   documents.upload, documents.delete,
--   queries.assign,
--   audit.view, firm_dashboard.view, insights.configure
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,

  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID NOT NULL REFERENCES users_profile(id),

  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users_profile(id),

  -- One row per (user, capability). Re-grant after revoke updates the same row.
  UNIQUE(user_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_staff_capabilities_user
  ON staff_capabilities(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_capabilities_capability
  ON staff_capabilities(capability) WHERE revoked_at IS NULL;

ALTER TABLE staff_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_caps_admin_all" ON staff_capabilities;
CREATE POLICY "staff_caps_admin_all" ON staff_capabilities
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "staff_caps_self_view" ON staff_capabilities;
CREATE POLICY "staff_caps_self_view" ON staff_capabilities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. CLIENT PORTAL VISIBILITY (granular per-client module toggle)
-- ----------------------------------------------------------------------------
-- Closed list of modules (v1) — see NEXTJS_BACKEND_ARCHITECTURE.md
-- §Portal visibility resolver. Default on portal-enable: dashboard + tasks +
-- queries only; admin opens additional modules explicitly per engagement.
--
-- Module keys (11, do not invent new ones without journaling):
--   portal.dashboard, portal.tasks, portal.documents, portal.queries,
--   portal.bizlens, portal.vcfo, portal.compliance_calendar, portal.insights,
--   portal.tax_projection, portal.notices, portal.vendors
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_portal_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,

  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),

  UNIQUE(client_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_visibility_client
  ON client_portal_visibility(client_id);

ALTER TABLE client_portal_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpv_admin_all" ON client_portal_visibility;
CREATE POLICY "cpv_admin_all" ON client_portal_visibility
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "cpv_team_read" ON client_portal_visibility;
CREATE POLICY "cpv_team_read" ON client_portal_visibility
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('team', 'admin')
    AND client_id IN (
      SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cpv_client_read" ON client_portal_visibility;
CREATE POLICY "cpv_client_read" ON client_portal_visibility
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATION PREFERENCES (per-user email digest cadence)
-- ----------------------------------------------------------------------------
-- email_frequency: 'immediate' (send each event), 'daily', 'weekly', 'off'
-- in_app_enabled : whether the in-app notifications row is also written
--                  (default TRUE; rarely turned off).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users_profile(id) ON DELETE CASCADE,
  email_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'off')),
  in_app_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_self" ON notification_preferences;
CREATE POLICY "notif_prefs_self" ON notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_prefs_admin" ON notification_preferences;
CREATE POLICY "notif_prefs_admin" ON notification_preferences
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 4. APPLICATION-LAYER CONTRACTS (not enforced in SQL)
-- ----------------------------------------------------------------------------
-- a) When admin sets clients.portal_enabled = TRUE, application code seeds
--    three default rows in client_portal_visibility:
--      (client_id, 'portal.dashboard', TRUE)
--      (client_id, 'portal.tasks',     TRUE)
--      (client_id, 'portal.queries',   TRUE)
--    Other modules remain absent (treated as disabled by the resolver).
--
-- b) Capability grants and revokes write a row to global_audit_log with
--    action='capability.grant' or 'capability.revoke', entity_type='user',
--    entity_id=target_user_id, details JSONB containing { capability, granted_by }.
--
-- c) client_portal_visibility updates write a row to global_audit_log with
--    action='portal_visibility.set', entity_type='client', entity_id=client_id,
--    details JSONB containing { module_key, is_enabled, by }.

-- ============================================================================
-- v3.2 ADDITIONS — May 8, 2026
-- ============================================================================
--
-- Reflects the workflow rewrite. Five new tables and one cleanup migration.
--
--   5. saved_views                 — fixes the missing table the
--                                    saved-views action references
--   6. sub_service_sop_steps       — admin-defined SOP per sub-service
--   7. task_steps                  — per-task copy of SOP steps with sign-off
--   8. staff_role_templates        — firm-defined role templates
--   9. staff_role_capabilities     — capabilities granted by a role template
--  10. client_import_batches       — bulk-import staging (audit + retry)
--  11. CLEANUP                     — DROP starter-set service catalogue rows
--                                    so admin defines services from scratch
--
-- Apply order: schema.sql → rls-additive.sql → schema-additions.sql (this file).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5. SAVED VIEWS (fix for missing table)
-- ----------------------------------------------------------------------------
-- Per-user, per-scope filter presets. Scope examples: 'tasks', 'clients',
-- 'queries', 'notices'. The filters JSON captures URL search params.

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, scope, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_scope
  ON saved_views(user_id, scope);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_views_self" ON saved_views;
CREATE POLICY "saved_views_self" ON saved_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. SUB-SERVICE SOP STEPS (custom workflow per sub-service)
-- ----------------------------------------------------------------------------
-- Admin defines the standard operating procedure per sub-service: an ordered
-- list of steps. When a task is created (manually or via the recurring cron)
-- from this sub-service, these steps are COPIED into task_steps for that task.
-- Editing the SOP affects future tasks only; existing tasks keep their copy.

CREATE TABLE IF NOT EXISTS sub_service_sop_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  UNIQUE(sub_service_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_sop_steps_sub_service
  ON sub_service_sop_steps(sub_service_id) WHERE is_deleted = FALSE;

ALTER TABLE sub_service_sop_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sop_admin" ON sub_service_sop_steps;
CREATE POLICY "sop_admin" ON sub_service_sop_steps
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "sop_team_read" ON sub_service_sop_steps;
CREATE POLICY "sop_team_read" ON sub_service_sop_steps
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('team', 'admin'));

-- ----------------------------------------------------------------------------
-- 7. TASK STEPS (per-task checklist with sign-off)
-- ----------------------------------------------------------------------------
-- Each task has its own ordered step list, copied from the sub-service's SOP
-- at task-creation time (or added ad-hoc by staff during execution). Each step
-- captures sign-off: who completed it, when, and an optional note.

CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,

  -- Sign-off
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users_profile(id),
  completion_note TEXT,

  -- Provenance: which SOP step seeded this row (NULL for ad-hoc steps)
  source_sop_step_id UUID REFERENCES sub_service_sop_steps(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(task_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_task_steps_task ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_task_steps_completed_by
  ON task_steps(completed_by) WHERE completed_at IS NOT NULL;

ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;

-- Admin: full
DROP POLICY IF EXISTS "task_steps_admin" ON task_steps;
CREATE POLICY "task_steps_admin" ON task_steps
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Team: visible/insert/update if assigned to the parent task's client
DROP POLICY IF EXISTS "task_steps_team" ON task_steps;
CREATE POLICY "task_steps_team" ON task_steps
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
      )
    )
  );

-- Client: read-only access to steps of tasks the client can see
DROP POLICY IF EXISTS "task_steps_client_read" ON task_steps;
CREATE POLICY "task_steps_client_read" ON task_steps
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM client_users
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
      AND status IN ('awaiting_client', 'completed')
    )
  );

-- ----------------------------------------------------------------------------
-- 8. STAFF ROLE TEMPLATES (firm-defined roles, no presets)
-- ----------------------------------------------------------------------------
-- Each firm defines its own role templates ("Senior Tax Associate", "Articleship",
-- whatever). Applying a role template to a staff member bulk-grants its
-- capabilities into staff_capabilities. Changing the role replaces the set;
-- individual overrides are tracked separately on staff_capabilities.

CREATE TABLE IF NOT EXISTS staff_role_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users_profile(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

ALTER TABLE staff_role_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_templates_admin" ON staff_role_templates;
CREATE POLICY "role_templates_admin" ON staff_role_templates
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "role_templates_team_read" ON staff_role_templates;
CREATE POLICY "role_templates_team_read" ON staff_role_templates
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));

CREATE TABLE IF NOT EXISTS staff_role_template_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES staff_role_templates(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,

  UNIQUE(template_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_role_template_caps_template
  ON staff_role_template_capabilities(template_id);

ALTER TABLE staff_role_template_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_template_caps_admin" ON staff_role_template_capabilities;
CREATE POLICY "role_template_caps_admin" ON staff_role_template_capabilities
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Track which template (if any) is currently applied to a staff member.
-- Optional pointer; staff_capabilities remains the source of truth for what
-- capabilities the user actually holds (incl. overrides).
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS active_role_template_id UUID REFERENCES staff_role_templates(id);

-- ----------------------------------------------------------------------------
-- 9. CLIENT IMPORT BATCHES (bulk import audit trail)
-- ----------------------------------------------------------------------------
-- One row per upload. Captures the file name, row counts, and any errors so
-- admin can audit a bulk import and re-run if needed.

CREATE TABLE IF NOT EXISTS client_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES users_profile(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),

  source_filename TEXT,
  total_rows INT NOT NULL,
  successful_rows INT NOT NULL DEFAULT 0,
  skipped_rows INT NOT NULL DEFAULT 0,
  error_rows INT NOT NULL DEFAULT 0,

  errors JSONB DEFAULT '[]',  -- array of { row_index, business_name, error }

  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_client_import_batches_uploaded_by
  ON client_import_batches(uploaded_by);

ALTER TABLE client_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_batches_admin" ON client_import_batches;
CREATE POLICY "import_batches_admin" ON client_import_batches
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 10. STARTER-SET CATALOGUE CLEANUP (run once, idempotent)
-- ----------------------------------------------------------------------------
-- The original schema.sql v3 inserted starter rows into service_categories,
-- services, and sub_services so the system was usable on first boot. The user
-- has confirmed they want a CLEAN SLATE: services and sub-services are
-- exclusively admin-defined.
--
-- This DELETE is idempotent — runs only against rows that match the original
-- starter-set and are NOT yet referenced by any client_services /
-- client_sub_services / tasks (so a later run after admin has already
-- referenced these rows will leave them alone).
--
-- IMPORTANT: Run this AFTER the admin has had a chance to delete starter rows
-- via the admin UI, or run it BEFORE any client gets services assigned.

DELETE FROM sub_services WHERE code IN (
  'GST_3B','GST_1','GST_9','TDS_Q','ITR','BL_MONTHLY','BL_QUARTERLY',
  'VCFO_CALL','VCFO_NOTE','CBAM_Q','SOX_ASSESS'
)
AND id NOT IN (SELECT sub_service_id FROM client_sub_services)
AND id NOT IN (SELECT sub_service_id FROM tasks WHERE sub_service_id IS NOT NULL);

DELETE FROM services WHERE code IN ('CAAS','BIZLENS','VCFO','CBAM','SOX')
AND id NOT IN (SELECT service_id FROM client_services)
AND id NOT IN (SELECT service_id FROM sub_services);

DELETE FROM service_categories WHERE name IN ('Compliance','Analytics','Advisory','Specialty')
AND id NOT IN (SELECT category_id FROM services);

-- ============================================================================
-- DONE — v3.2
-- ============================================================================

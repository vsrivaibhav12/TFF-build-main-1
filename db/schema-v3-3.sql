-- ============================================================
-- THE FISCAL FULCRUM — Schema v3.3 (GO_FORWARD_PLAN v3)
-- ============================================================
-- Run after v3.2 (db/schema-additions.sql).
-- Idempotent where possible (IF NOT EXISTS / DO blocks). Safe to re-run.
--
-- Adjustments from the spec to match this codebase's conventions:
--   * users_profile(id) FK target, NOT auth.users(id)
--   * public.current_user_role() helper, NOT auth.jwt() ->> 'role'
--   * team_client_assignment(team_user_id, client_id), NOT client_assignments
--   * uuid_generate_v4() default, NOT gen_random_uuid()
--   * attendance_logs table, NOT attendance
--   * Capability strings live in lib/auth/capabilities.ts (closed list);
--     no `capabilities` master table is created here.
-- ============================================================


-- ----------------------------------------------------------------
-- Section 1: Tasks — collapse status, add stuck/verification/PC/CC
-- ----------------------------------------------------------------

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_blocked_on_client     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_stuck                 BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stuck_reason_code        TEXT,
  ADD COLUMN IF NOT EXISTS stuck_reason_note        TEXT,
  ADD COLUMN IF NOT EXISTS client_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_status      TEXT NOT NULL DEFAULT 'not_required'
    CHECK (verification_status IN ('not_required','pending','verified')),
  ADD COLUMN IF NOT EXISTS verified_by_user_id      UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS verified_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_note        TEXT,
  ADD COLUMN IF NOT EXISTS profit_centre_code       TEXT,
  ADD COLUMN IF NOT EXISTS cost_centre_code         TEXT,
  ADD COLUMN IF NOT EXISTS billing_entity_id        UUID,
  ADD COLUMN IF NOT EXISTS estimated_hours          NUMERIC(8,2);

-- Migrate legacy enum values BEFORE swapping the check constraint.
-- Audit trail: write a task_activity row noting the v3 status migration.
DO $$
BEGIN
  -- awaiting_client → in_progress + is_blocked_on_client = TRUE
  INSERT INTO task_activity (task_id, action, field_name, old_value, new_value, changed_by)
  SELECT t.id, 'v3_status_migration', 'status', 'awaiting_client', 'in_progress (blocked_on_client)', NULL
  FROM tasks t WHERE t.status = 'awaiting_client';

  UPDATE tasks
     SET is_blocked_on_client = TRUE,
         status = 'in_progress',
         updated_at = NOW()
   WHERE status = 'awaiting_client';

  -- review → in_progress (verification handled separately by sub-service flag)
  INSERT INTO task_activity (task_id, action, field_name, old_value, new_value, changed_by)
  SELECT t.id, 'v3_status_migration', 'status', 'review', 'in_progress', NULL
  FROM tasks t WHERE t.status = 'review';

  UPDATE tasks
     SET status = 'in_progress',
         updated_at = NOW()
   WHERE status = 'review';
END $$;

-- Replace status check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending','in_progress','completed','cancelled'));

-- Stuck reason check
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_stuck_reason_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_stuck_reason_check
  CHECK (stuck_reason_code IS NULL OR stuck_reason_code IN (
    'client_clarification','gst_portal_down','itd_portal_down','mcadown',
    'mismatch_investigation','awaiting_third_party','awaiting_management',
    'dsc_issue','payment_pending','other'
  ));

CREATE INDEX IF NOT EXISTS idx_tasks_is_stuck       ON tasks(is_stuck) WHERE is_stuck = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_client ON tasks(is_blocked_on_client) WHERE is_blocked_on_client = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_profit_centre  ON tasks(profit_centre_code);
CREATE INDEX IF NOT EXISTS idx_tasks_billing_entity ON tasks(billing_entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_verification   ON tasks(verification_status) WHERE verification_status = 'pending';


-- ----------------------------------------------------------------
-- Section 2: Profit Centres + Cost Centres + Billing Entities
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profit_centres (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centres (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_entities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  legal_name      TEXT,
  gstin           TEXT,
  pan             TEXT,
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  invoice_prefix  TEXT NOT NULL,
  default_profit_centre_code TEXT REFERENCES profit_centres(code),
  signing_authority_name TEXT,
  signing_authority_designation TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc       TEXT,
  bank_name       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_billing_entity_access (
  user_id           UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  billing_entity_id UUID NOT NULL REFERENCES billing_entities(id) ON DELETE CASCADE,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, billing_entity_id)
);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS default_profit_centre_code TEXT REFERENCES profit_centres(code),
  ADD COLUMN IF NOT EXISTS default_cost_centre_code   TEXT REFERENCES cost_centres(code),
  ADD COLUMN IF NOT EXISTS default_billing_entity_id  UUID REFERENCES billing_entities(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_billing_entity_fk') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_billing_entity_fk FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id);
  END IF;
END $$;

ALTER TABLE profit_centres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centres              ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_entities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing_entity_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_read    ON profit_centres;
DROP POLICY IF EXISTS pc_admin   ON profit_centres;
DROP POLICY IF EXISTS cc_read    ON cost_centres;
DROP POLICY IF EXISTS cc_admin   ON cost_centres;
DROP POLICY IF EXISTS be_read    ON billing_entities;
DROP POLICY IF EXISTS be_admin   ON billing_entities;
DROP POLICY IF EXISTS ubea_self  ON user_billing_entity_access;
DROP POLICY IF EXISTS ubea_admin ON user_billing_entity_access;

CREATE POLICY pc_read   ON profit_centres   FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY pc_admin  ON profit_centres   FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY cc_read   ON cost_centres     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY cc_admin  ON cost_centres     FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY be_read   ON billing_entities FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR id IN (SELECT billing_entity_id FROM user_billing_entity_access WHERE user_id = auth.uid())
);
CREATE POLICY be_admin  ON billing_entities FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY ubea_self  ON user_billing_entity_access FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY ubea_admin ON user_billing_entity_access FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ----------------------------------------------------------------
-- Section 3: Compliance Calendar Rules Engine
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS compliance_calendar_rules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_code           TEXT NOT NULL UNIQUE,
  display_name        TEXT NOT NULL,
  service_kind        TEXT NOT NULL,
  periodicity         TEXT NOT NULL,
  due_day             INTEGER,
  due_month_offset    INTEGER NOT NULL DEFAULT 1,
  due_date_formula    TEXT,
  applies_when        JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminder_days       INTEGER[] NOT NULL DEFAULT '{7,3,1}',
  description         TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccr_kind   ON compliance_calendar_rules(service_kind);
CREATE INDEX IF NOT EXISTS idx_ccr_active ON compliance_calendar_rules(is_active) WHERE is_active = TRUE;

ALTER TABLE compliance_calendar_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccr_read  ON compliance_calendar_rules;
DROP POLICY IF EXISTS ccr_admin ON compliance_calendar_rules;
CREATE POLICY ccr_read  ON compliance_calendar_rules FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ccr_admin ON compliance_calendar_rules FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE TABLE IF NOT EXISTS client_compliance_profiles (
  client_id                UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  gst_filing_frequency     TEXT CHECK (gst_filing_frequency IN ('monthly','qrmp','not_applicable')),
  state_group              TEXT CHECK (state_group IN ('A','B') OR state_group IS NULL),
  entity_type              TEXT CHECK (entity_type IN ('company','llp','firm','proprietorship','huf','trust','aop','boi','individual')),
  is_audit_applicable      BOOLEAN NOT NULL DEFAULT FALSE,
  is_tds_deductor          BOOLEAN NOT NULL DEFAULT FALSE,
  is_tcs_collector         BOOLEAN NOT NULL DEFAULT FALSE,
  is_advance_tax_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  is_pf_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
  is_esi_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  is_pt_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
  pt_state                 TEXT,
  is_roc_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  agm_date                 DATE,
  is_transfer_pricing      BOOLEAN NOT NULL DEFAULT FALSE,
  annual_turnover_estimate NUMERIC(15,2),
  fy_start_month           INTEGER NOT NULL DEFAULT 4,
  notes                    TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_compliance_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccp_team_read ON client_compliance_profiles;
DROP POLICY IF EXISTS ccp_admin     ON client_compliance_profiles;
CREATE POLICY ccp_team_read ON client_compliance_profiles FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
);
CREATE POLICY ccp_admin     ON client_compliance_profiles FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
) WITH CHECK (public.current_user_role() IN ('admin','team'));

CREATE TABLE IF NOT EXISTS compliance_calendar_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id           UUID NOT NULL REFERENCES compliance_calendar_rules(id) ON DELETE CASCADE,
  rule_code         TEXT NOT NULL,
  period_label      TEXT NOT NULL,
  due_date          DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','task_created','filed','overdue','dismissed')),
  task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, rule_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_cce_client_due ON compliance_calendar_events(client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_cce_status     ON compliance_calendar_events(status);

ALTER TABLE compliance_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cce_team   ON compliance_calendar_events;
DROP POLICY IF EXISTS cce_client ON compliance_calendar_events;
DROP POLICY IF EXISTS cce_admin  ON compliance_calendar_events;
CREATE POLICY cce_team   ON compliance_calendar_events FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
);
CREATE POLICY cce_client ON compliance_calendar_events FOR SELECT TO authenticated USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
CREATE POLICY cce_admin  ON compliance_calendar_events FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
) WITH CHECK (public.current_user_role() IN ('admin','team'));


-- ----------------------------------------------------------------
-- Section 4: Document Requests
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_name     TEXT NOT NULL,
  description       TEXT,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  due_date          DATE,
  fulfilled_at      TIMESTAMPTZ,
  fulfilled_by_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  fulfilled_by_user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES users_profile(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docreq_task    ON document_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_docreq_client  ON document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_docreq_pending ON document_requests(client_id) WHERE fulfilled_at IS NULL;

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS docreq_team          ON document_requests;
DROP POLICY IF EXISTS docreq_client        ON document_requests;
DROP POLICY IF EXISTS docreq_client_update ON document_requests;
CREATE POLICY docreq_team   ON document_requests FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
) WITH CHECK (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
);
CREATE POLICY docreq_client ON document_requests FOR SELECT TO authenticated USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
CREATE POLICY docreq_client_update ON document_requests FOR UPDATE TO authenticated USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
) WITH CHECK (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);

CREATE TABLE IF NOT EXISTS sub_service_document_request_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_service_id  UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  document_name   TEXT NOT NULL,
  description     TEXT,
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ssdrt_sub_service ON sub_service_document_request_templates(sub_service_id, display_order);

ALTER TABLE sub_service_document_request_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ssdrt_read  ON sub_service_document_request_templates;
DROP POLICY IF EXISTS ssdrt_admin ON sub_service_document_request_templates;
CREATE POLICY ssdrt_read  ON sub_service_document_request_templates FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ssdrt_admin ON sub_service_document_request_templates FOR ALL TO authenticated USING (
  public.current_user_role() = 'admin'
) WITH CHECK (public.current_user_role() = 'admin');


-- ----------------------------------------------------------------
-- Section 5: Custom Fields and Labels
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_custom_field_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID REFERENCES services(id) ON DELETE CASCADE,
  sub_service_id  UUID REFERENCES sub_services(id) ON DELETE CASCADE,
  field_key       TEXT NOT NULL,
  display_label   TEXT NOT NULL,
  field_type      TEXT NOT NULL CHECK (field_type IN ('text','number','date','dropdown','boolean')),
  options_json    JSONB,
  is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (service_id IS NOT NULL OR sub_service_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tcfd_subsvc_key ON task_custom_field_definitions(sub_service_id, field_key) WHERE sub_service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tcfd_svc_key    ON task_custom_field_definitions(service_id, field_key)    WHERE service_id IS NOT NULL AND sub_service_id IS NULL;

CREATE TABLE IF NOT EXISTS task_custom_field_values (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES task_custom_field_definitions(id) ON DELETE CASCADE,
  value_text    TEXT,
  value_number  NUMERIC(20,4),
  value_date    DATE,
  value_bool    BOOLEAN,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, definition_id)
);

CREATE INDEX IF NOT EXISTS idx_tcfv_task ON task_custom_field_values(task_id);

ALTER TABLE task_custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_custom_field_values      ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tcfd_read  ON task_custom_field_definitions;
DROP POLICY IF EXISTS tcfd_admin ON task_custom_field_definitions;
DROP POLICY IF EXISTS tcfv_team  ON task_custom_field_values;
CREATE POLICY tcfd_read  ON task_custom_field_definitions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY tcfd_admin ON task_custom_field_definitions FOR ALL TO authenticated USING (
  public.current_user_role() = 'admin'
) WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY tcfv_team  ON task_custom_field_values FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
) WITH CHECK (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
);

CREATE TABLE IF NOT EXISTS task_labels (
  code         TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  color_hex    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_code  TEXT NOT NULL REFERENCES task_labels(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, label_code)
);

ALTER TABLE task_labels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_label_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tl_read  ON task_labels;
DROP POLICY IF EXISTS tl_admin ON task_labels;
DROP POLICY IF EXISTS tla_team ON task_label_assignments;
CREATE POLICY tl_read  ON task_labels FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY tl_admin ON task_labels FOR ALL TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY tla_team ON task_label_assignments FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
) WITH CHECK (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
);


-- ----------------------------------------------------------------
-- Section 6: WorkDone (timesheet)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_workdone (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  note          TEXT,
  entry_method  TEXT NOT NULL CHECK (entry_method IN ('timer','manual')),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workdone_task   ON task_workdone(task_id);
CREATE INDEX IF NOT EXISTS idx_workdone_user_d ON task_workdone(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_workdone_client ON task_workdone(client_id);

ALTER TABLE task_workdone ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wd_self      ON task_workdone;
DROP POLICY IF EXISTS wd_team_read ON task_workdone;
CREATE POLICY wd_self      ON task_workdone FOR ALL TO authenticated USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
) WITH CHECK (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY wd_team_read ON task_workdone FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
);


-- ----------------------------------------------------------------
-- Section 7: Geo-tagged attendance
-- ----------------------------------------------------------------

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS check_in_lat        NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS check_in_lng        NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m INTEGER,
  ADD COLUMN IF NOT EXISTS check_in_address    TEXT;

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS geo_check_in_required BOOLEAN NOT NULL DEFAULT FALSE;


-- ----------------------------------------------------------------
-- Section 8: Inward-Outward removal
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS inward_outward_register CASCADE;


-- ============================================================
-- Done.
-- ============================================================

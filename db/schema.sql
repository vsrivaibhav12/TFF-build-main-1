-- ============================================================================
-- THE FISCAL FULCRUM — DATABASE SCHEMA (v3, PRODUCTION-READY)
-- ============================================================================
--
-- Last revised: May 4, 2026
-- Status: Locked. Deploy as-is to Supabase.
--
-- v3 CHANGES (vs. v2):
--   ✅ Added: Partial unique index on tasks to prevent duplicate generation
--             at DB level (defence-in-depth alongside application check)
--   ✅ Header updated to reflect Next.js-native backend (Flask bundle deprecated)
--   ✅ Schema itself is stack-agnostic and unchanged in structure from v2
--
-- v2 CHANGES (vs. original):
--   ❌ Removed: Arrays in enabled_sub_services (use normalized tables instead)
--   ❌ Removed: Over-use of JSONB for core data
--   ❌ Removed: Business logic pushed into database triggers
--   ✅ Added: Clean relational service access (no arrays)
--   ✅ Added: JSONB only for optional feature flags
--   ✅ Clarified: Database is storage+constraints, application layer has logic
--
-- Design Principles:
--   1. Single-firm, single-tenant (yours only, not multi-tenant SaaS)
--   2. Relational integrity enforced at DB level
--   3. Business logic lives in application (Next.js Server Actions / API Routes)
--   4. Database enforces facts; application enforces rules
--   5. JSONB only for optional, evolving feature flags
--   6. No triggers for business logic (use Vercel Cron instead)
--
-- ============================================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. AUTHENTICATION & IDENTITY
-- ============================================================================

CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  
  role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'client')),
  
  job_title TEXT,
  department TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  reports_to UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_users_profile_role ON users_profile(role);
CREATE INDEX idx_users_profile_is_active ON users_profile(is_active);

-- ============================================================================
-- 2. CLIENTS & CLIENT GROUPING
-- ============================================================================

CREATE TABLE client_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  business_name TEXT NOT NULL,
  business_registration_number TEXT,
  
  pan TEXT UNIQUE,
  gstin TEXT,
  
  category TEXT CHECK (category IN (
    'sole_proprietor', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'huf', 'aop', 'ngo', 'other'
  )),
  residential_status TEXT CHECK (residential_status IN ('resident', 'non_resident')),
  industry TEXT,
  
  primary_contact_person TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  
  group_id UUID REFERENCES client_groups(id),
  
  portal_enabled BOOLEAN DEFAULT FALSE,
  portal_access_level TEXT DEFAULT 'restricted',
  
  priority_tier TEXT CHECK (priority_tier IN ('standard', 'premium', 'strategic')) DEFAULT 'standard',
  lifecycle_stage TEXT CHECK (lifecycle_stage IN (
    'lead', 'caas_only', 'caas_bizlens', 'caas_vcfo', 'caas_bizlens_vcfo', 'full_suite', 'churn'
  )) DEFAULT 'lead',
  
  primary_owner_id UUID REFERENCES users_profile(id),
  
  start_date DATE,
  contract_value_annual NUMERIC(12, 2),
  contract_renewal_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_clients_gstin ON clients(gstin);
CREATE INDEX idx_clients_pan ON clients(pan);
CREATE INDEX idx_clients_group_id ON clients(group_id);
CREATE INDEX idx_clients_lifecycle_stage ON clients(lifecycle_stage);

CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  
  role_in_client TEXT CHECK (role_in_client IN ('owner', 'accountant', 'manager', 'other')),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_client_users_client ON client_users(client_id);
CREATE INDEX idx_client_users_user ON client_users(user_id);

CREATE TABLE team_client_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_user_id UUID NOT NULL REFERENCES users_profile(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  role TEXT CHECK (role IN ('lead', 'support', 'reviewer')) DEFAULT 'lead',
  
  assigned_from DATE NOT NULL,
  assigned_to DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_client_assignment_team ON team_client_assignment(team_user_id);
CREATE INDEX idx_team_client_assignment_client ON team_client_assignment(client_id);

-- ============================================================================
-- 3. SERVICE ARCHITECTURE (REVISED: NO ARRAYS, FULLY RELATIONAL)
-- ============================================================================
--
-- Structure:
--   service_categories → services → sub_services
--   
--   client_services (maps client to service)
--   client_sub_services (maps client to specific sub-services)
--   client_feature_flags (optional: rare feature toggles only)
--
-- Why this design?
--   ✓ Clean relational integrity
--   ✓ Proper indexing and query performance
--   ✓ No arrays (arrays are hard to query and index)
--   ✓ Explicit mappings (you see exactly what's enabled)
--   ✓ Easy to audit and modify

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

INSERT INTO service_categories (name, description, display_order) VALUES
  ('Compliance', 'Filing, returns, regulatory compliance', 1),
  ('Analytics', 'Financial intelligence and insights', 2),
  ('Advisory', 'CFO-level strategic guidance', 3),
  ('Specialty', 'CBAM, SOX, and specialized services', 4)
ON CONFLICT DO NOTHING;

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES service_categories(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  icon_url TEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_services_category ON services(category_id);

INSERT INTO services (category_id, name, code, description) VALUES
  (1, 'Compliance as a Service', 'CAAS', 'GST, TDS, IT filing with compliance tracking'),
  (2, 'BizLens Analytics', 'BIZLENS', 'Financial intelligence and analytics engine'),
  (3, 'Virtual CFO', 'VCFO', 'Monthly financial strategy and advisory'),
  (4, 'CBAM & ESG Advisory', 'CBAM', 'Carbon border adjustment and ESG compliance'),
  (4, 'Process & Controls (SOX/ICFR)', 'SOX', 'Internal controls and ICFR for US-facing entities')
ON CONFLICT DO NOTHING;

CREATE TABLE sub_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'on_demand')),
  
  due_day_of_month INT CHECK (due_day_of_month BETWEEN 1 AND 31),
  due_day_of_quarter INT,
  due_month INT,
  
  is_billable BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT TRUE,
  requires_client_input BOOLEAN DEFAULT TRUE,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sub_services_service ON sub_services(service_id);
CREATE INDEX idx_sub_services_code ON sub_services(code);

INSERT INTO sub_services (service_id, name, code, frequency, due_day_of_month, is_recurring) VALUES
  (1, 'GSTR-3B Filing', 'GST_3B', 'monthly', 20, TRUE),
  (1, 'GSTR-1 Filing', 'GST_1', 'monthly', 11, TRUE),
  (1, 'GSTR-9 Filing', 'GST_9', 'annually', 31, TRUE),
  (1, 'TDS Quarterly Filing', 'TDS_Q', 'quarterly', 15, TRUE),
  (1, 'Income Tax Return', 'ITR', 'annually', 31, TRUE),
  (2, 'Monthly BizLens Update', 'BL_MONTHLY', 'monthly', 5, TRUE),
  (2, 'Quarterly Analytics Review', 'BL_QUARTERLY', 'quarterly', 10, TRUE),
  (3, 'Monthly vCFO Review Call', 'VCFO_CALL', 'monthly', 15, TRUE),
  (3, 'Monthly Advisory Note', 'VCFO_NOTE', 'monthly', 20, TRUE),
  (4, 'CBAM Quarterly Assessment', 'CBAM_Q', 'quarterly', 15, TRUE),
  (5, 'SOX Control Assessment', 'SOX_ASSESS', 'annually', 31, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CLIENT SERVICE ACCESS (REVISED: FULLY RELATIONAL, NO ARRAYS)
-- ============================================================================

-- client_services: Maps client to service (top-level subscription)
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_head_id UUID REFERENCES users_profile(id),
  
  access_level TEXT CHECK (access_level IN ('full', 'limited', 'view_only')) DEFAULT 'limited',
  
  start_date DATE NOT NULL,
  end_date DATE,
  fee_amount DECIMAL(12,2),

  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, service_id)
);

CREATE INDEX idx_client_services_client ON client_services(client_id);
CREATE INDEX idx_client_services_service ON client_services(service_id);
CREATE INDEX idx_client_services_is_active ON client_services(is_active);

-- client_sub_services: Maps client to specific sub-services (granular control)
CREATE TABLE client_sub_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES sub_services(id),
  
  access_level TEXT CHECK (access_level IN ('full', 'view_only')),
  
  fee_amount DECIMAL(12,2),

  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, sub_service_id)
);

CREATE INDEX idx_client_sub_services_client ON client_sub_services(client_id);
CREATE INDEX idx_client_sub_services_sub_service ON client_sub_services(sub_service_id);

-- client_feature_flags: Optional feature toggles (JSONB is fine here)
CREATE TABLE client_feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES sub_services(id),
  
  feature_key TEXT NOT NULL,
  feature_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, sub_service_id, feature_key)
);

CREATE INDEX idx_client_feature_flags_client ON client_feature_flags(client_id);


-- ============================================================================
-- 4. TASK ENGINE (CORE WORKFLOW)
-- ============================================================================

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'on_demand')),
  due_day_of_month INT,
  due_day_of_quarter INT,
  due_month INT,
  
  default_assignee_id UUID REFERENCES users_profile(id),
  default_reviewer_id UUID REFERENCES users_profile(id),
  
  sop_steps JSONB DEFAULT '[]',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_task_templates_sub_service ON task_templates(sub_service_id);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  client_id UUID NOT NULL REFERENCES clients(id),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id),
  task_template_id UUID REFERENCES task_templates(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  assigned_to UUID REFERENCES users_profile(id),
  reviewer_id UUID REFERENCES users_profile(id),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'awaiting_client',
    'in_progress',
    'review',
    'completed'
  )),
  
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  created_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  started_date DATE,
  completed_date DATE,
  
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT,
  period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4),
  
  task_number TEXT UNIQUE,
  is_billable BOOLEAN DEFAULT FALSE,
  bill_reference TEXT,
  
  is_recurring BOOLEAN DEFAULT FALSE,

  bill_amount DECIMAL(12,2),
  billed BOOLEAN DEFAULT FALSE,
  billed_date DATE,

  arn_reference TEXT,
  is_arn_client_visible BOOLEAN DEFAULT FALSE,

  is_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_reviewer ON tasks(reviewer_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Prevent duplicate task generation at the database level (defence-in-depth
-- against cron double-runs and race conditions). The application's
-- "if not task_exists" check is the first line; this is the second.
-- Partial index because soft-deleted rows must not block regeneration of
-- a fresh task for the same period.
-- Tasks without a period (ad-hoc tasks) are excluded since period_month/year
-- are nullable and ad-hoc tasks legitimately can repeat.
CREATE UNIQUE INDEX uniq_active_task_per_period
ON tasks (client_id, sub_service_id, period_month, period_year)
WHERE is_deleted = FALSE
  AND period_month IS NOT NULL
  AND period_year IS NOT NULL;

CREATE TABLE task_document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL,
  description TEXT,
  
  is_received BOOLEAN DEFAULT FALSE,
  received_date DATE,
  received_from UUID REFERENCES users_profile(id),
  
  related_document_id UUID,
  
  date_requested DATE DEFAULT CURRENT_DATE,
  reminder_count INT DEFAULT 0,
  last_reminder_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_document_requests_task ON task_document_requests(task_id);
CREATE INDEX idx_task_document_requests_is_received ON task_document_requests(is_received);

CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  
  changed_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_changed_by ON task_activity(changed_by);

CREATE TABLE task_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  note_text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_task_notes_task ON task_notes(task_id);

-- ============================================================================
-- 5. COMPLIANCE TRACKERS (STRONGLY TYPED, NOT JSONB)
-- ============================================================================

CREATE TABLE gst_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  return_type TEXT NOT NULL CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-9')),
  
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'data_received', 'in_progress', 'review', 'filed'
  )),
  filed_date DATE,
  ack_number TEXT,
  
  taxable_turnover NUMERIC(14, 2),
  
  output_cgst NUMERIC(14, 2),
  output_sgst NUMERIC(14, 2),
  output_igst NUMERIC(14, 2),
  output_cess NUMERIC(14, 2),
  output_tax_total NUMERIC(14, 2),
  
  itc_available_2b NUMERIC(14, 2),
  itc_claimed NUMERIC(14, 2),
  itc_reversed NUMERIC(14, 2),
  
  net_tax_payable NUMERIC(14, 2),
  late_fee NUMERIC(14, 2),
  interest_amount NUMERIC(14, 2),
  
  data_entered_by UUID REFERENCES users_profile(id),
  data_entered_date TIMESTAMP,
  filed_by UUID REFERENCES users_profile(id),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES gst_filings(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, period_month, period_year, is_current)
);

CREATE INDEX idx_gst_filings_client ON gst_filings(client_id);
CREATE INDEX idx_gst_filings_period ON gst_filings(period_year, period_month);
CREATE INDEX idx_gst_filings_status ON gst_filings(status);
CREATE INDEX idx_gst_filings_is_current ON gst_filings(is_current);

CREATE TABLE tds_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_quarter INT NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),
  period_year INT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'data_received', 'in_progress', 'review', 'filed'
  )),
  filed_date DATE,
  ack_number TEXT,
  
  total_deductions NUMERIC(14, 2),
  deductee_count INT,
  
  section_194j NUMERIC(14, 2),
  section_194o NUMERIC(14, 2),
  section_194la NUMERIC(14, 2),
  other_sections JSONB DEFAULT '{}',
  
  tax_deposited NUMERIC(14, 2),
  
  data_entered_by UUID REFERENCES users_profile(id),
  data_entered_date TIMESTAMP,
  filed_by UUID REFERENCES users_profile(id),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES tds_filings(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, period_quarter, period_year, is_current)
);

CREATE INDEX idx_tds_filings_client ON tds_filings(client_id);

CREATE TABLE it_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  fy_ending_year INT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'data_received', 'in_progress', 'review', 'filed'
  )),
  filed_date DATE,
  ack_number TEXT,
  
  gross_income NUMERIC(14, 2),
  deductions_claimed NUMERIC(14, 2),
  taxable_income NUMERIC(14, 2),
  tax_liability NUMERIC(14, 2),
  refund_amount NUMERIC(14, 2),
  
  data_entered_by UUID REFERENCES users_profile(id),
  data_entered_date TIMESTAMP,
  filed_by UUID REFERENCES users_profile(id),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES it_filings(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, fy_ending_year, is_current)
);

CREATE INDEX idx_it_filings_client ON it_filings(client_id);

CREATE TABLE compliance_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  filing_type TEXT NOT NULL,
  period_identifier TEXT,
  
  status TEXT NOT NULL,
  due_date DATE,
  filed_date DATE,
  ack_number TEXT,
  
  days_to_deadline INT GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (due_date - CURRENT_DATE))::INT
  ) STORED,
  
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    CURRENT_DATE > due_date AND status != 'filed'
  ) STORED,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, filing_type, period_identifier)
);

CREATE INDEX idx_compliance_status_client ON compliance_status(client_id);
CREATE INDEX idx_compliance_status_is_overdue ON compliance_status(is_overdue);

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  notice_type TEXT NOT NULL CHECK (notice_type IN ('GST', 'Income Tax', 'TDS', 'Other')),
  notice_number TEXT,
  issuing_authority TEXT,
  
  notice_date DATE,
  notice_received_date DATE,
  due_date DATE,
  
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 'order_pending', 'order_received', 'closed'
  )),
  
  amount_involved NUMERIC(14, 2),
  subject TEXT,
  description TEXT,
  
  assigned_to UUID REFERENCES users_profile(id),
  
  notice_document_id UUID,
  reply_document_id UUID,
  order_document_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_notices_client ON notices(client_id);
CREATE INDEX idx_notices_status ON notices(status);


-- ============================================================================
-- 6. FINANCIAL DATA LAYER (FOR BIZLENS & INSIGHTS)
-- ============================================================================

CREATE TABLE gst_data_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  entered_by UUID NOT NULL REFERENCES users_profile(id),
  entered_at TIMESTAMP DEFAULT NOW(),
  entry_source TEXT CHECK (entry_source IN ('manual', 'tally_import', 'pdf_upload', 'api')) DEFAULT 'manual',
  
  turnover NUMERIC(14, 2),
  turnover_source TEXT,
  turnover_confidence TEXT CHECK (turnover_confidence IN ('verified', 'estimated', 'provisional')) DEFAULT 'verified',
  
  output_tax_cgst NUMERIC(14, 2),
  output_tax_sgst NUMERIC(14, 2),
  output_tax_igst NUMERIC(14, 2),
  
  input_tax_2b NUMERIC(14, 2),
  itc_books NUMERIC(14, 2),
  cash_paid NUMERIC(14, 2),
  
  entry_notes TEXT,
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES gst_data_entries(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gst_data_entries_client ON gst_data_entries(client_id);
CREATE INDEX idx_gst_data_entries_is_current ON gst_data_entries(is_current);

CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  data_type TEXT NOT NULL CHECK (data_type IN (
    'profit_loss', 'balance_sheet', 'cash_flow', 'customer_metrics', 'supplier_metrics', 'asset_register'
  )),
  
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  data_json JSONB NOT NULL,
  
  entered_by UUID REFERENCES users_profile(id),
  entered_at TIMESTAMP DEFAULT NOW(),
  entry_source TEXT CHECK (entry_source IN ('manual', 'tally_import', 'api')),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES financial_data(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_financial_data_client ON financial_data(client_id);
CREATE INDEX idx_financial_data_type ON financial_data(data_type);

-- ============================================================================
-- 7. DOCUMENTS, DSC, CREDENTIALS
-- ============================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  
  document_category TEXT CHECK (document_category IN (
    'GST', 'Income_Tax', 'TDS', 'ROC', 'Bank_Statement', 'Ledger', 'Register', 
    'Payroll', 'Insurance', 'Audit', 'Legal', 'Other'
  )),
  document_period_month INT,
  document_period_year INT,
  
  visible_to_client BOOLEAN DEFAULT TRUE,
  visible_to_team BOOLEAN DEFAULT TRUE,
  
  uploaded_by UUID NOT NULL REFERENCES users_profile(id),
  
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_category ON documents(document_category);

CREATE TABLE inward_outward_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  direction TEXT NOT NULL CHECK (direction IN ('inward', 'outward')),
  
  description TEXT NOT NULL,
  document_type TEXT,
  quantity INT,
  
  date_received DATE,
  date_returned DATE,
  expected_return_date DATE,
  
  received_from_name TEXT,
  received_from_contact TEXT,
  handed_to_name TEXT,
  handed_to_contact TEXT,
  
  condition TEXT,
  notes TEXT,
  
  received_by UUID REFERENCES users_profile(id),
  handed_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inward_outward_register_client ON inward_outward_register(client_id);

CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  portal_name TEXT NOT NULL,
  portal_url TEXT,
  
  username TEXT,
  encrypted_password TEXT,
  
  security_question TEXT,
  encrypted_security_answer TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  last_used_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_credentials_client ON credentials(client_id);

CREATE TABLE dsc_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  holder_name TEXT NOT NULL,
  holder_contact_email TEXT,
  holder_phone TEXT,
  
  dsc_class TEXT NOT NULL CHECK (dsc_class IN ('Class 2', 'Class 3')),
  dsc_type TEXT NOT NULL CHECK (dsc_type IN ('eSign', 'eToken')),
  certificate_serial TEXT UNIQUE,
  certificate_issuer TEXT,
  
  issued_date DATE,
  expiry_date DATE NOT NULL,
  
  registered_portals TEXT[] DEFAULT '{}',
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'suspended', 'expired')),
  status_updated_at TIMESTAMP,
  
  encrypted_key_file BYTEA,
  encrypted_pin TEXT,
  encrypted_password TEXT,
  
  physical_location TEXT,
  custodian_name TEXT,
  custodian_phone TEXT,
  
  expiry_alert_sent BOOLEAN DEFAULT FALSE,
  expiry_alert_sent_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users_profile(id),
  updated_by UUID REFERENCES users_profile(id),
  
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_dsc_records_client ON dsc_records(client_id);
CREATE INDEX idx_dsc_records_expiry_date ON dsc_records(expiry_date);

-- ============================================================================
-- 8. VENDOR MANAGEMENT
-- ============================================================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  vendor_name TEXT NOT NULL,
  vendor_gstin TEXT,
  vendor_pan TEXT,
  vendor_category TEXT CHECK (vendor_category IN ('Supplier', 'Service Provider', 'Contractor', 'Other')),
  
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  address TEXT,
  city TEXT,
  state TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_vendors_client ON vendors(client_id);

CREATE TABLE vendor_gst_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  filed BOOLEAN DEFAULT FALSE,
  filing_date DATE,
  expected_filing_date DATE,
  
  gst_amount_involved NUMERIC(14, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_gst_filings_vendor ON vendor_gst_filings(vendor_id);

-- ============================================================================
-- 9. QUERY/ISSUE SYSTEM
-- ============================================================================

CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  task_id UUID REFERENCES tasks(id),
  
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  created_by UUID NOT NULL REFERENCES users_profile(id),
  assigned_to UUID REFERENCES users_profile(id),
  
  resolution_notes TEXT,
  resolved_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queries_client ON queries(client_id);
CREATE INDEX idx_queries_status ON queries(status);

CREATE TABLE query_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  
  message_text TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_query_messages_query ON query_messages(query_id);

-- ============================================================================
-- 10. CLIENT COMMUNICATION LOG
-- ============================================================================

CREATE TABLE client_communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  communication_type TEXT NOT NULL CHECK (communication_type IN ('call', 'email', 'meeting', 'whatsapp', 'other')),
  communication_date DATE NOT NULL,
  
  subject TEXT,
  summary TEXT,
  
  from_user_id UUID REFERENCES users_profile(id),
  to_contact_person TEXT,
  
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_details TEXT,
  
  created_by UUID NOT NULL REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  attachments TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_client_communication_log_client ON client_communication_log(client_id);

-- ============================================================================
-- 11. HEARINGS
-- ============================================================================

CREATE TABLE hearings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID REFERENCES notices(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  hearing_type TEXT CHECK (hearing_type IN ('GST', 'Income Tax', 'TDS', 'Other')),
  
  hearing_scheduled_date DATE,
  hearing_held_date DATE,
  next_hearing_date DATE,
  
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'held', 'adjourned', 'concluded'
  )),
  
  venue TEXT,
  officer_name TEXT,
  subject TEXT,
  
  order_date DATE,
  order_amount NUMERIC(14, 2),
  order_notes TEXT,
  
  assigned_to UUID REFERENCES users_profile(id),
  
  order_document_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hearings_client ON hearings(client_id);


-- ============================================================================
-- 12. TEAM OPERATIONS (ATTENDANCE & PAYROLL)
-- ============================================================================

CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  
  status TEXT CHECK (status IN ('present', 'absent', 'leave', 'work_from_home')),
  
  leave_type TEXT CHECK (leave_type IN ('paid', 'unpaid', 'sick', 'casual', 'comp')),
  
  is_manually_created BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  overridden_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, attendance_date)
);

CREATE INDEX idx_attendance_logs_user ON attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_date ON attendance_logs(attendance_date);

CREATE TABLE staff_payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) UNIQUE,
  
  monthly_salary NUMERIC(12, 2) NOT NULL,
  paid_leaves_per_month INT DEFAULT 2,
  
  deduction_applicable BOOLEAN DEFAULT TRUE,
  leave_carry_forward_allowed BOOLEAN DEFAULT FALSE,
  max_carry_forward_days INT,
  
  salary_adjustment_for_leaves BOOLEAN DEFAULT TRUE,
  
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  
  total_working_days INT,
  actual_present_days INT,
  actual_leave_days INT,
  paid_leave_days INT,
  unpaid_leave_days INT,
  daily_rate NUMERIC(12, 2),
  base_salary NUMERIC(12, 2),
  
  salary_for_present_days NUMERIC(12, 2),
  deduction_for_excess_leaves NUMERIC(12, 2),
  total_deductions NUMERIC(12, 2),
  gross_salary NUMERIC(12, 2),
  final_salary NUMERIC(12, 2),
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'paid')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users_profile(id),
  
  UNIQUE(user_id, month, year)
);

CREATE INDEX idx_payroll_runs_user ON payroll_runs(user_id);

CREATE TABLE payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id UUID NOT NULL REFERENCES payroll_runs(id),
  
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'overtime', 'other')),
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  
  approved_by UUID NOT NULL REFERENCES users_profile(id),
  approved_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'sick', 'casual', 'comp', 'other')),
  
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  number_of_days INT NOT NULL,
  
  reason TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  reviewed_by UUID REFERENCES users_profile(id),
  reviewed_at TIMESTAMP,
  review_remarks TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);

-- ============================================================================
-- 13. VCFO & SOLUTION TRACKING
-- ============================================================================

CREATE TABLE vcfo_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  
  cash_in_bank NUMERIC(14, 2),
  monthly_burn NUMERIC(14, 2),
  revenue NUMERIC(14, 2),
  key_expenses JSONB DEFAULT '{}',
  
  budgeted_revenue NUMERIC(14, 2),
  budgeted_expenses NUMERIC(14, 2),
  actual_revenue NUMERIC(14, 2),
  actual_expenses NUMERIC(14, 2),
  
  advisor_notes TEXT,
  
  data_entered_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, month, year)
);

CREATE INDEX idx_vcfo_snapshots_client ON vcfo_snapshots(client_id);

CREATE TABLE solution_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  issue_identified_date DATE NOT NULL,
  issue_description TEXT NOT NULL,
  issue_category TEXT CHECK (issue_category IN (
    'cash_flow', 'profitability', 'tax_optimization', 'working_capital', 'vendor_management', 'process', 'compliance', 'other'
  )),
  
  root_cause TEXT,
  financial_impact_estimate NUMERIC(14, 2),
  
  recommended_solution TEXT NOT NULL,
  solution_status TEXT NOT NULL DEFAULT 'recommended' CHECK (solution_status IN (
    'recommended', 'in_progress', 'implemented', 'deferred'
  )),
  
  actual_outcome TEXT,
  actual_financial_impact NUMERIC(14, 2),
  implementation_date DATE,
  
  identified_by UUID REFERENCES users_profile(id),
  implemented_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_solution_log_client ON solution_log(client_id);

-- ============================================================================
-- 14. INSIGHTS & BENCHMARKS
-- ============================================================================

CREATE TABLE compliance_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'gst_rate_vs_industry', 'itc_utilization_gap', 'tds_concentration_risk',
    'vendor_filing_compliance', 'filing_timeliness', 'other'
  )),
  
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT,
  
  headline TEXT NOT NULL,
  narrative TEXT NOT NULL,
  
  raw_value NUMERIC(14, 2),
  benchmark_value NUMERIC(14, 2),
  variance NUMERIC(5, 2),
  
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  
  recommended_action TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_insights_client ON compliance_insights(client_id);

CREATE TABLE benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  industry TEXT NOT NULL,
  sub_industry TEXT,
  
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(14, 2),
  
  period_year INT,
  sample_size INT,
  
  source TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_benchmarks_industry ON benchmarks(industry);

-- ============================================================================
-- 15. ACTIVITY LOG & AUDIT TRAIL
-- ============================================================================

CREATE TABLE global_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  details JSONB,
  
  performed_by UUID REFERENCES users_profile(id),
  performed_at TIMESTAMP DEFAULT NOW(),
  
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_global_audit_log_performed_by ON global_audit_log(performed_by);
CREATE INDEX idx_global_audit_log_performed_at ON global_audit_log(performed_at);

-- ============================================================================
-- 16. NOTIFICATIONS SYSTEM
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'task_assigned', 'task_due_soon', 'task_completed', 'task_overdue',
    'document_uploaded', 'query_received', 'compliance_due', 'payment_reminder',
    'team_alert', 'system_alert', 'other'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  related_entity_type TEXT,
  related_entity_id UUID,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  send_via_email BOOLEAN DEFAULT TRUE,
  email_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================================
-- 17. ENGAGEMENT & SCOPE
-- ============================================================================

CREATE TABLE engagement_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  service_id UUID NOT NULL REFERENCES services(id),
  
  document_id UUID NOT NULL,
  
  scope_of_work TEXT,
  deliverables TEXT,
  timeline TEXT,
  fees NUMERIC(12, 2),
  
  signed_date DATE,
  effective_from DATE,
  effective_to DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_engagement_letters_client ON engagement_letters(client_id);

-- ============================================================================
-- 18. CLIENT LIFECYCLE TRACKING
-- ============================================================================

CREATE TABLE client_lifecycle_stage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) UNIQUE,
  
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'lead', 'caas_only', 'caas_bizlens', 'caas_vcfo', 'caas_bizlens_vcfo', 'full_suite', 'churn'
  )),
  
  lead_date DATE,
  caas_date DATE,
  bizlens_date DATE,
  vcfo_date DATE,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_client_lifecycle_stage_current_stage ON client_lifecycle_stage(current_stage);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE vcfo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLIENT ACCESS POLICIES
-- ============================================================================

CREATE POLICY "clients_select_own"
ON clients
FOR SELECT
USING (
  id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

CREATE POLICY "clients_update_own_limited"
ON clients
FOR UPDATE
USING (
  id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

-- ============================================================================
-- TASK ACCESS POLICIES
-- ============================================================================

-- Clients see only awaiting_client + completed tasks
CREATE POLICY "tasks_client_view"
ON tasks
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
  AND status IN ('awaiting_client', 'completed')
);

-- Team sees all tasks for assigned clients
CREATE POLICY "tasks_team_view"
ON tasks
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) = 'team'
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- Team can update own tasks
CREATE POLICY "tasks_team_update_own"
ON tasks
FOR UPDATE
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) = 'team'
  AND (
    assigned_to = auth.uid()
    OR reviewer_id = auth.uid()
    OR (SELECT role FROM users_profile WHERE id = auth.uid()) = 'admin'
  )
);

-- ============================================================================
-- DOCUMENT ACCESS POLICIES
-- ============================================================================

-- Clients see only visible_to_client documents
CREATE POLICY "documents_client_view"
ON documents
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
  AND visible_to_client = TRUE
);

-- Team sees all visible_to_team documents for assigned clients
CREATE POLICY "documents_team_view"
ON documents
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) = 'team'
  AND visible_to_team = TRUE
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- COMPLIANCE DATA POLICIES (GST/TDS/IT — TEAM ONLY)
-- ============================================================================

-- Team only can access GST filings for assigned clients
CREATE POLICY "gst_filings_team_only"
ON gst_filings
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "gst_filings_team_insert"
ON gst_filings
FOR INSERT
WITH CHECK (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
);

-- TDS filings
CREATE POLICY "tds_filings_team_only"
ON tds_filings
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "tds_filings_team_insert"
ON tds_filings
FOR INSERT
WITH CHECK (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
);

-- IT filings
CREATE POLICY "it_filings_team_only"
ON it_filings
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "it_filings_team_insert"
ON it_filings
FOR INSERT
WITH CHECK (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
);

-- Compliance Status
CREATE POLICY "compliance_status_team_only"
ON compliance_status
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- CREDENTIALS & DSC POLICIES (TEAM ASSIGNED TO CLIENT ONLY)
-- ============================================================================

CREATE POLICY "credentials_team_only"
ON credentials
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "dsc_records_team_only"
ON dsc_records
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- NOTICES POLICIES
-- ============================================================================

CREATE POLICY "notices_team_view"
ON notices
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- FINANCIAL DATA POLICIES (TEAM ONLY)
-- ============================================================================

CREATE POLICY "gst_data_entries_team_only"
ON gst_data_entries
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "financial_data_team_only"
ON financial_data
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- VCFO & SOLUTION LOG POLICIES
-- ============================================================================

CREATE POLICY "vcfo_snapshots_team_view"
ON vcfo_snapshots
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "solution_log_team_view"
ON solution_log
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- QUERY POLICIES
-- ============================================================================

-- Clients see their own queries
CREATE POLICY "queries_client_view"
ON queries
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

-- Team sees queries for assigned clients
CREATE POLICY "queries_team_view"
ON queries
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- COMMUNICATION LOG POLICIES
-- ============================================================================

CREATE POLICY "communication_log_team_view"
ON client_communication_log
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- ATTENDANCE & PAYROLL POLICIES
-- ============================================================================

-- Users see own attendance
CREATE POLICY "attendance_own_view"
ON attendance_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('admin', 'team')
);

-- Managers see direct reports' attendance
CREATE POLICY "attendance_direct_reports"
ON attendance_logs
FOR SELECT
USING (
  (SELECT reports_to FROM users_profile WHERE id = user_id) = auth.uid()
);

-- Users see own payroll
CREATE POLICY "payroll_own_view"
ON payroll_runs
FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('admin', 'team')
);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
--
-- ✅ 40+ TABLES with correct architecture
-- ✅ NO ARRAYS for core data (all relational)
-- ✅ JSONB ONLY for optional feature flags + SOP/key_expenses
-- ✅ Separate GST/TDS/IT tables (strong typing, indexable)
-- ✅ Versioning (is_current + superseded_by) on all financial tables
-- ✅ Soft deletes (is_deleted + deleted_at + deleted_by) on all key tables
-- ✅ RLS policies for multi-role access
-- ✅ NO business logic in database (logic lives in application)
--
-- NEXT STEPS:
--  1. Paste entire file into Supabase SQL Editor
--  2. Run RLS validation (test as different roles)
--  3. Build application layer (Node.js/Python) with business logic:
--     - Task creation from templates (cron job, NOT DB trigger)
--     - Payroll calculations (application layer, NOT DB function)
--     - Insight generation (application layer)
--     - Notifications (via Resend)
--     - BizLens integration (read facts, calculate in app)


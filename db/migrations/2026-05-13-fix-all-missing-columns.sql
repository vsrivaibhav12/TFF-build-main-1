-- ============================================================================
-- Fix ALL missing columns — idempotent, safe to re-run
-- This adds every column the Next.js app expects that may not exist in the DB.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- tasks table
-- ---------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bill_reference TEXT,
  ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billed_date DATE,
  ADD COLUMN IF NOT EXISTS arn_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_arn_client_visible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS period_year INT,
  ADD COLUMN IF NOT EXISTS period_month INT CHECK (period_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS is_blocked_on_client BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_stuck BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stuck_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verification_note TEXT,
  ADD COLUMN IF NOT EXISTS client_approval_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profit_centre_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_entity_id UUID,
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2);

-- Make sub_service_id nullable (standalone tasks)
ALTER TABLE tasks ALTER COLUMN sub_service_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- client_services / client_sub_services fee columns
-- ---------------------------------------------------------------------------
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);
ALTER TABLE client_sub_services ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

-- ---------------------------------------------------------------------------
-- document_requests — fulfilled_by_user_id stamp
-- ---------------------------------------------------------------------------
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS fulfilled_by_user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- users_profile geo flag
-- ---------------------------------------------------------------------------
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS geo_check_in_required BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- Phase 2 — Task Engine Enhancements
-- Bill amount, ARN, billing tracker, fee columns
-- ============================================================================

-- 1. Make sub_service_id nullable (standalone tasks are valid)
ALTER TABLE tasks ALTER COLUMN sub_service_id DROP NOT NULL;

-- 2. Add billing amount to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billed_date DATE;

-- 3. Add ARN / reference number field (GST ARN, IT ack, etc.)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS arn_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_arn_client_visible BOOLEAN DEFAULT FALSE;

-- 4. Add fee columns to client services
ALTER TABLE client_services
  ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

ALTER TABLE client_sub_services
  ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

-- 5. Add is_verified QA badge to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

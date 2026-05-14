-- ============================================================================
-- Portal Gating — Plan tier + module visibility
-- ============================================================================

-- Add plan tier to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'caas_growth'
    CHECK (plan_tier IN (
      'caas_starter','caas_growth','caas_enterprise',
      'bizlens_only',
      'vcfo_essential','vcfo_growth','vcfo_premium',
      'process_controls','cbam_esg'
    ));

-- Add portal module overrides (JSONB — which modules are visible)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_modules JSONB DEFAULT NULL;

-- Add manager_id to users_profile for leave approval chain
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users_profile(id) ON DELETE SET NULL;

-- Add monthly_salary and paid_leaves_per_month to users_profile
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS paid_leaves_per_month DECIMAL(4,1) DEFAULT 1.0;

-- Add firm_profile table for firm details
CREATE TABLE IF NOT EXISTS firm_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gstin TEXT,
  pan TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default firm profile if empty
INSERT INTO firm_profile (firm_name, address, city, state, gstin, pan, phone, email)
SELECT 'The Fiscal Fulcrum LLP', '', 'Coimbatore', 'Tamil Nadu', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM firm_profile);

-- GST monthly data table
CREATE TABLE IF NOT EXISTS gst_monthly_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  turnover_taxable DECIMAL(14,2) DEFAULT 0,
  turnover_exempt DECIMAL(14,2) DEFAULT 0,
  turnover_nil_rated DECIMAL(14,2) DEFAULT 0,
  turnover_zero_rated DECIMAL(14,2) DEFAULT 0,
  output_cgst DECIMAL(14,2) DEFAULT 0,
  output_sgst DECIMAL(14,2) DEFAULT 0,
  output_igst DECIMAL(14,2) DEFAULT 0,
  output_cess DECIMAL(14,2) DEFAULT 0,
  input_2b_cgst DECIMAL(14,2) DEFAULT 0,
  input_2b_sgst DECIMAL(14,2) DEFAULT 0,
  input_2b_igst DECIMAL(14,2) DEFAULT 0,
  input_2b_cess DECIMAL(14,2) DEFAULT 0,
  input_books_cgst DECIMAL(14,2) DEFAULT 0,
  input_books_sgst DECIMAL(14,2) DEFAULT 0,
  input_books_igst DECIMAL(14,2) DEFAULT 0,
  input_books_cess DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_cgst DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_sgst DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_igst DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_cess DECIMAL(14,2) DEFAULT 0,
  carry_forward_itc DECIMAL(14,2) DEFAULT 0,
  vendor_filing_percent DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_gst_monthly_client ON gst_monthly_data(client_id, period_year, period_month);

ALTER TABLE gst_monthly_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gst_data_team ON gst_monthly_data;
CREATE POLICY gst_data_team ON gst_monthly_data FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);

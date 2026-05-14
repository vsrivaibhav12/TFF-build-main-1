-- ============================================================================
-- THE FISCAL FULCRUM — BIZLENS NATIVE PORT (v3.3)
-- ============================================================================
-- Apply this file to the database to create the columnar schema for BizLens.

CREATE TABLE IF NOT EXISTS bizlens_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Core period
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  months_covered INT NOT NULL DEFAULT 1,
  
  -- P&L / Operations
  sales_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  variable_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fixed_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fc_includes_interest BOOLEAN DEFAULT FALSE,
  purchases NUMERIC(14, 2) DEFAULT 0,
  interest_expense NUMERIC(14, 2) DEFAULT 0,
  target_profit NUMERIC(14, 2) DEFAULT 0,
  inventory_change NUMERIC(14, 2) DEFAULT 0,
  other_income NUMERIC(14, 2) DEFAULT 0,
  non_cash_expenses NUMERIC(14, 2) DEFAULT 0,
  
  -- Balance Sheet: Assets
  bs_cash NUMERIC(14, 2) DEFAULT 0,
  bs_inventory NUMERIC(14, 2) DEFAULT 0,
  bs_accounts_receivable NUMERIC(14, 2) DEFAULT 0,
  bs_other_current_assets NUMERIC(14, 2) DEFAULT 0,
  bs_loans_advances NUMERIC(14, 2) DEFAULT 0,
  realisable_fixed_assets NUMERIC(14, 2) DEFAULT 0,
  
  -- Balance Sheet: Liabilities & Equity
  bs_accounts_payable NUMERIC(14, 2) DEFAULT 0,
  bs_current_liabilities_other NUMERIC(14, 2) DEFAULT 0,
  bs_short_term_borrowings NUMERIC(14, 2) DEFAULT 0,
  bs_long_term_borrowings NUMERIC(14, 2) DEFAULT 0,
  bs_other_liabilities NUMERIC(14, 2) DEFAULT 0,
  bs_equity NUMERIC(14, 2) DEFAULT 0,
  
  -- Ageing (AR)
  ar_ageing_available BOOLEAN DEFAULT FALSE,
  ar_0_30 NUMERIC(14, 2) DEFAULT 0,
  ar_31_60 NUMERIC(14, 2) DEFAULT 0,
  ar_61_90 NUMERIC(14, 2) DEFAULT 0,
  ar_90_plus NUMERIC(14, 2) DEFAULT 0,
  
  -- Ageing (AP)
  ap_ageing_available BOOLEAN DEFAULT FALSE,
  ap_0_30 NUMERIC(14, 2) DEFAULT 0,
  ap_31_60 NUMERIC(14, 2) DEFAULT 0,
  ap_61_90 NUMERIC(14, 2) DEFAULT 0,
  ap_90_plus NUMERIC(14, 2) DEFAULT 0,
  
  -- Concentration & Strategic
  top_customer_pct NUMERIC(5, 2),
  top_supplier_pct NUMERIC(5, 2),
  wc_intentional BOOLEAN DEFAULT FALSE,
  ap_strategic BOOLEAN DEFAULT FALSE,
  
  -- State
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- For overriding older versions for the same period
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES bizlens_data(id)
);

CREATE INDEX IF NOT EXISTS idx_bizlens_data_client ON bizlens_data(client_id);
CREATE INDEX IF NOT EXISTS idx_bizlens_data_period ON bizlens_data(period_year, period_month);
-- Partial unique: only one CURRENT report per (client, period). Historical
-- (is_current=false) rows are unrestricted so we can keep an audit chain.
CREATE UNIQUE INDEX IF NOT EXISTS bizlens_data_current_per_period_uidx
  ON bizlens_data(client_id, period_month, period_year)
  WHERE is_current = TRUE;

ALTER TABLE bizlens_data ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "bizlens_admin_all" ON bizlens_data;
CREATE POLICY "bizlens_admin_all" ON bizlens_data
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Team: access if assigned to client AND holds 'bizlens.enter' capability
DROP POLICY IF EXISTS "bizlens_team_all" ON bizlens_data;
CREATE POLICY "bizlens_team_all" ON bizlens_data
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM staff_capabilities WHERE user_id = auth.uid() AND capability = 'bizlens.enter' AND revoked_at IS NULL)
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM staff_capabilities WHERE user_id = auth.uid() AND capability = 'bizlens.enter' AND revoked_at IS NULL)
  );

-- Team (View Only): access if assigned to client (even without bizlens.enter)
DROP POLICY IF EXISTS "bizlens_team_read" ON bizlens_data;
CREATE POLICY "bizlens_team_read" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

-- Client: access if portal module enabled and status is published
DROP POLICY IF EXISTS "bizlens_client_read" ON bizlens_data;
CREATE POLICY "bizlens_client_read" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND status = 'published'
    AND client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
    AND EXISTS (SELECT 1 FROM client_portal_visibility WHERE client_id = bizlens_data.client_id AND module_key = 'portal.bizlens' AND is_enabled = TRUE)
  );

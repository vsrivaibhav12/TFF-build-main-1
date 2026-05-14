-- ============================================================
-- Seed: Compliance Calendar Rules (idempotent)
-- ============================================================
-- Captures the Indian statutory schedule. Admin can edit later
-- via /admin/settings/compliance-rules. Periodicities and
-- predicates drive lib/services/compliance-calendar-engine.ts.
--
-- For TDS quarterly returns we use due_date_formula because
-- each quarter ends in a different month.
-- ============================================================

INSERT INTO compliance_calendar_rules
  (rule_code, display_name, service_kind, periodicity, due_day, due_month_offset, due_date_formula, applies_when, reminder_days, description)
VALUES
  -- ---------------- GST ----------------
  ('GSTR1_M',    'GSTR-1 (Monthly)',           'gst', 'monthly',   11, 1, NULL,
    '{"gst_filing_frequency":"monthly"}'::jsonb, '{7,3,1}',  'Monthly outward supplies return'),

  ('GSTR1_Q',    'GSTR-1 / IFF (Quarterly)',   'gst', 'quarterly', 13, 1, NULL,
    '{"gst_filing_frequency":"qrmp"}'::jsonb,    '{7,3,1}',  'QRMP outward supplies return'),

  ('GSTR3B_M',   'GSTR-3B (Monthly)',          'gst', 'monthly',   20, 1, NULL,
    '{"gst_filing_frequency":"monthly"}'::jsonb, '{7,3,1}',  'Monthly summary return'),

  ('GSTR3B_QA',  'GSTR-3B (QRMP, Group A)',    'gst', 'quarterly', 22, 1, NULL,
    '{"gst_filing_frequency":"qrmp","state_group":"A"}'::jsonb, '{7,3,1}',
    'QRMP summary return — Group A states'),

  ('GSTR3B_QB',  'GSTR-3B (QRMP, Group B)',    'gst', 'quarterly', 24, 1, NULL,
    '{"gst_filing_frequency":"qrmp","state_group":"B"}'::jsonb, '{7,3,1}',
    'QRMP summary return — Group B (incl. TN)'),

  ('GSTR9',      'GSTR-9 Annual Return',       'gst', 'yearly',    31, 9, NULL,
    '{"annual_turnover_above":20000000}'::jsonb, '{30,7,1}', 'Annual GST return (>₹2 Cr turnover)'),

  ('GSTR9C',     'GSTR-9C Reconciliation',     'gst', 'yearly',    31, 9, NULL,
    '{"is_audit_applicable":true}'::jsonb,       '{30,7,1}', 'GST reconciliation statement'),

  -- ---------------- TDS ----------------
  ('TDS_PAY_NM', 'TDS Payment (non-March)',    'tds', 'monthly',    7, 1, NULL,
    '{"is_tds_deductor":true,"exclude_month":3}'::jsonb, '{3,1}',
    'Monthly TDS payment by 7th of following month'),

  ('TDS_PAY_MAR','TDS Payment (March)',        'tds', 'yearly',    30, 1, NULL,
    '{"is_tds_deductor":true,"month":3}'::jsonb, '{7,3,1}',
    'March-period TDS payment by 30 April'),

  ('TDS_24Q_Q1', 'TDS 24Q (Salary) Q1',        'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":1}'::jsonb, '{7,3,1}', 'Salary TDS return Q1 (by 31 July)'),
  ('TDS_24Q_Q2', 'TDS 24Q (Salary) Q2',        'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":2}'::jsonb, '{7,3,1}', 'Salary TDS return Q2 (by 31 Oct)'),
  ('TDS_24Q_Q3', 'TDS 24Q (Salary) Q3',        'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":3}'::jsonb, '{7,3,1}', 'Salary TDS return Q3 (by 31 Jan)'),
  ('TDS_24Q_Q4', 'TDS 24Q (Salary) Q4',        'tds', 'quarterly', 31, 0, 'quarter_end+2m+0d',
    '{"is_tds_deductor":true,"quarter":4}'::jsonb, '{7,3,1}', 'Salary TDS return Q4 (by 31 May)'),

  ('TDS_26Q_Q1', 'TDS 26Q (Non-salary) Q1',    'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":1}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q1'),
  ('TDS_26Q_Q2', 'TDS 26Q (Non-salary) Q2',    'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":2}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q2'),
  ('TDS_26Q_Q3', 'TDS 26Q (Non-salary) Q3',    'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":3}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q3'),
  ('TDS_26Q_Q4', 'TDS 26Q (Non-salary) Q4',    'tds', 'quarterly', 31, 0, 'quarter_end+2m+0d',
    '{"is_tds_deductor":true,"quarter":4}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q4'),

  -- ---------------- TCS ----------------
  ('TCS_27EQ_Q1','TCS 27EQ Q1',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":1}'::jsonb, '{7,3,1}', 'TCS return Q1 (by 15 July)'),
  ('TCS_27EQ_Q2','TCS 27EQ Q2',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":2}'::jsonb, '{7,3,1}', 'TCS return Q2 (by 15 Oct)'),
  ('TCS_27EQ_Q3','TCS 27EQ Q3',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":3}'::jsonb, '{7,3,1}', 'TCS return Q3 (by 15 Jan)'),
  ('TCS_27EQ_Q4','TCS 27EQ Q4',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":4}'::jsonb, '{7,3,1}', 'TCS return Q4 (by 15 May)'),

  -- ---------------- Advance Tax ----------------
  ('ADV_TAX_Q1', 'Advance Tax 1st Instalment 15%',  'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":6}'::jsonb,  '{7,3,1}', '15% by 15 June'),
  ('ADV_TAX_Q2', 'Advance Tax 2nd Instalment 45%',  'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":9}'::jsonb,  '{7,3,1}', '45% by 15 September'),
  ('ADV_TAX_Q3', 'Advance Tax 3rd Instalment 75%',  'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":12}'::jsonb, '{7,3,1}', '75% by 15 December'),
  ('ADV_TAX_Q4', 'Advance Tax 4th Instalment 100%', 'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":3}'::jsonb,  '{7,3,1}', '100% by 15 March'),

  -- ---------------- ITR + Tax Audit ----------------
  ('ITR_NA',  'ITR (Non-Audit)',               'it',  'yearly', 31, 4, NULL,
    '{"is_audit_applicable":false}'::jsonb,                       '{30,7,1}', 'Non-audit ITR by 31 July'),
  ('ITR_AUD', 'ITR (Audit Cases)',             'it',  'yearly', 31, 7, NULL,
    '{"is_audit_applicable":true,"is_transfer_pricing":false}'::jsonb, '{30,7,1}', 'Audit ITR by 31 October'),
  ('ITR_TP',  'ITR (Transfer Pricing)',        'it',  'yearly', 30, 8, NULL,
    '{"is_transfer_pricing":true}'::jsonb,                        '{30,7,1}', 'TP ITR by 30 November'),
  ('TAX_AUDIT','Tax Audit u/s 44AB',            'it',  'yearly', 30, 6, NULL,
    '{"is_audit_applicable":true}'::jsonb,                        '{30,7,1}', 'Tax audit by 30 September'),

  -- ---------------- ROC ----------------
  ('AOC4',    'ROC AOC-4',                     'roc', 'yearly', NULL, 0, 'agm_date+30d',
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'AOC-4 within 30 days of AGM'),
  ('MGT7',    'ROC MGT-7',                     'roc', 'yearly', NULL, 0, 'agm_date+60d',
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'MGT-7 within 60 days of AGM'),
  ('DPT3',    'DPT-3',                         'roc', 'yearly', 30, 3, NULL,
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'DPT-3 by 30 June'),
  ('DIR3KYC', 'DIR-3 KYC',                     'roc', 'yearly', 30, 6, NULL,
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'DIR-3 KYC by 30 September'),

  -- ---------------- PF / ESI / PT ----------------
  ('PF_PAY',  'PF Payment',                    'pf',  'monthly',   15, 1, NULL,
    '{"is_pf_applicable":true}'::jsonb,  '{3,1}', 'PF deposit by 15th of next month'),
  ('ESI_PAY', 'ESI Payment',                   'esi', 'monthly',   15, 1, NULL,
    '{"is_esi_applicable":true}'::jsonb, '{3,1}', 'ESI deposit by 15th of next month'),

  ('PT_TN_OCT','PT (Tamil Nadu) — Oct half',   'pt',  'half_yearly', 1, 4, NULL,
    '{"is_pt_applicable":true,"pt_state":"TN"}'::jsonb, '{7,3,1}', 'TN PT October half-year'),
  ('PT_TN_APR','PT (Tamil Nadu) — Apr half',   'pt',  'half_yearly', 1, 0, NULL,
    '{"is_pt_applicable":true,"pt_state":"TN"}'::jsonb, '{7,3,1}', 'TN PT April half-year')

ON CONFLICT (rule_code) DO NOTHING;

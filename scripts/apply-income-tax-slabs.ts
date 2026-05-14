/**
 * Add income_tax_slabs table for editable IT rate configuration.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string, label: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 800)}`);
  return text;
}

async function main() {
  const sql = `
CREATE TABLE IF NOT EXISTS income_tax_slabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_year TEXT NOT NULL,
  category TEXT NOT NULL,
  min_income NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_income NUMERIC(15,2),
  rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  cess_percent NUMERIC(5,2) NOT NULL DEFAULT 4,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_year, category, min_income)
);

CREATE INDEX IF NOT EXISTS idx_it_slabs_ay ON income_tax_slabs(assessment_year, category);

ALTER TABLE income_tax_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS it_slabs_admin ON income_tax_slabs;
CREATE POLICY it_slabs_admin ON income_tax_slabs FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
`;
  console.log('[income-tax] applying income_tax_slabs + RLS');
  await runSql(sql, 'income-tax');
  console.log('[income-tax] done');
}

main().catch((e) => { console.error(e); process.exit(1); });

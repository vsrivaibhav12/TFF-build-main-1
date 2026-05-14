/**
 * Add bizlens_period_snapshots table for multi-period trend analysis.
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
CREATE TABLE IF NOT EXISTS bizlens_period_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  months_covered INT NOT NULL DEFAULT 12,
  data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_bizlens_snapshots_client ON bizlens_period_snapshots(client_id, period_year, period_month);

ALTER TABLE bizlens_period_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bizlens_snapshots_team ON bizlens_period_snapshots;
CREATE POLICY bizlens_snapshots_team ON bizlens_period_snapshots FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
`;
  console.log('[bizlens-prior] applying bizlens_period_snapshots + RLS');
  await runSql(sql, 'bizlens-prior');
  console.log('[bizlens-prior] done');
}

main().catch((e) => { console.error(e); process.exit(1); });

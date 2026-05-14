/**
 * Apply /app/db/schema-additions.sql via Supabase Management API.
 * Adds: staff_capabilities, client_portal_visibility, notification_preferences
 * + bizlens_data + RLS policies. Idempotent (CREATE TABLE IF NOT EXISTS).
 */
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
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
  const file = path.join(process.cwd(), 'db', 'schema-additions.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[additions] applying schema-additions.sql (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, 'additions');

  // Day-10 journal: bizlens_data table for embedded analytics state.
  // Per GO_FORWARD_PLAN §Day 10: keys (client_id, month, year, state_json).
  console.log('[additions] applying bizlens_data + grants');
  const extra = `
    CREATE TABLE IF NOT EXISTS bizlens_data (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
      year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
      state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by UUID REFERENCES users_profile(id),
      UNIQUE(client_id, month, year)
    );
    CREATE INDEX IF NOT EXISTS idx_bizlens_data_client ON bizlens_data(client_id);
    ALTER TABLE bizlens_data ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS bizlens_admin ON bizlens_data;
    CREATE POLICY bizlens_admin ON bizlens_data FOR ALL TO authenticated
      USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');
    DROP POLICY IF EXISTS bizlens_team ON bizlens_data;
    CREATE POLICY bizlens_team ON bizlens_data FOR ALL TO authenticated
      USING (public.current_user_role() = 'team' AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()));
    DROP POLICY IF EXISTS bizlens_client_read ON bizlens_data;
    CREATE POLICY bizlens_client_read ON bizlens_data FOR SELECT TO authenticated
      USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  `;
  await runSql(extra, 'extra');

  // Sanity
  const r = await runSql(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`,
    'count'
  );
  console.log('[additions] public tables ->', r);
}

main().catch((e) => { console.error('[additions] FATAL', e?.message ?? e); process.exit(1); });

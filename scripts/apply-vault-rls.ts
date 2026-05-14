/**
 * Apply vault RLS policies (dsc_records + credentials) via Supabase Management API.
 * Idempotent: DROP POLICY IF EXISTS + CREATE POLICY.
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
  const file = path.join(process.cwd(), 'db', 'rls-additive.sql');
  const sql = fs.readFileSync(file, 'utf8');

  // Extract only the dsc_records / credentials section (last block after the notices section)
  const marker = '-- dsc_records / credentials : admin full, team assigned clients';
  const idx = sql.indexOf(marker);
  if (idx === -1) throw new Error('Vault RLS block not found in rls-additive.sql');
  const vaultSql = sql.slice(idx);

  console.log(`[vault-rls] applying vault RLS policies (${vaultSql.length} chars)`);
  await runSql(vaultSql, 'vault-rls');

  // Sanity: count policies on dsc_records and credentials
  const r = await runSql(
    `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('dsc_records', 'credentials') ORDER BY tablename, policyname;`,
    'policy-count'
  );
  console.log('[vault-rls] current policies:', r);
}

main().catch((e) => { console.error('[vault-rls] FATAL', e?.message ?? e); process.exit(1); });

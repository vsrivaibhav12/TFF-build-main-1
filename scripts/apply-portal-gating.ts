/**
 * Apply portal gating schema migration via Supabase Management API.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
if (!PAT || !REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF');
  process.exit(1);
}
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string, label: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 1500)}`);
  }
  return text;
}

async function main() {
  const sql = fs.readFileSync(path.join(process.cwd(), 'db', 'migrations', '2026-05-14-portal-gating.sql'), 'utf8');
  console.log(`[portal-gating] applying ${sql.length} bytes of SQL`);
  await runSql(sql, 'portal-gating main');
  console.log('[portal-gating] applied OK');
}

main().catch((e) => {
  console.error('[portal-gating] FATAL', e?.message ?? e);
  process.exit(1);
});

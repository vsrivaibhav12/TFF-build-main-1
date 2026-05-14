/**
 * Apply Group B — Service Hierarchy Rebuild migration.
 * TFF Rebuild Plan v1.0 §4.3
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
  const file = path.join(process.cwd(), 'db', 'migrations', '2026-05-13-group-b-service-hierarchy.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[group-b] applying migration (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, 'group-b');
  console.log('[group-b] migration applied successfully');
}

main().catch((e) => { console.error('[group-b] FATAL', e?.message ?? e); process.exit(1); });

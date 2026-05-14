/**
 * Apply the comprehensive "fix all missing columns" migration via Supabase Management API.
 * Idempotent — safe to re-run.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
if (!PAT || !REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env.local');
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
  const sql = fs.readFileSync(path.join(process.cwd(), 'db', 'migrations', '2026-05-13-fix-all-missing-columns.sql'), 'utf8');
  console.log(`[fix-all] applying ${sql.length} bytes of SQL`);
  await runSql(sql, 'fix-all main');
  console.log('[fix-all] applied OK');

  const colVerify = await runSql(
    `SELECT column_name FROM information_schema.columns
       WHERE table_name='tasks'
         AND column_name IN (
           'task_number','is_billable','bill_reference','bill_amount','billed',
           'billed_date','arn_reference','is_arn_client_visible','is_verified',
           'period_year','period_month','period_quarter','is_deleted','deleted_at','deleted_by'
         )
       ORDER BY column_name;`,
    'verify-task-cols',
  );
  console.log('[fix-all] task columns verified:', colVerify);
  console.log('[fix-all] DONE');
}

main().catch((e) => {
  console.error('[fix-all] FATAL', e?.message ?? e);
  process.exit(1);
});

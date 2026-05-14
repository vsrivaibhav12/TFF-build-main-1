/**
 * Apply Phase 2 task enhancements schema migration via Supabase Management API.
 * Idempotent — safe to re-run.
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
  const sql = fs.readFileSync(path.join(process.cwd(), 'db', 'migrations', '2026-05-13-phase-2-task-enhancements.sql'), 'utf8');
  console.log(`[phase-2] applying ${sql.length} bytes of SQL`);
  await runSql(sql, 'phase-2 main');
  console.log('[phase-2] applied OK');

  // Verify columns
  const colVerify = await runSql(
    `SELECT column_name FROM information_schema.columns
       WHERE table_name='tasks'
         AND column_name IN (
           'bill_amount','billed','billed_date','arn_reference',
           'is_arn_client_visible','is_verified'
         )
       ORDER BY column_name;`,
    'verify-task-cols',
  );
  console.log('[phase-2] task columns verified:', colVerify);

  const feeVerify = await runSql(
    `SELECT column_name FROM information_schema.columns
       WHERE table_name IN ('client_services','client_sub_services')
         AND column_name = 'fee_amount'
       ORDER BY table_name;`,
    'verify-fee-cols',
  );
  console.log('[phase-2] fee columns verified:', feeVerify);

  console.log('[phase-2] DONE');
}

main().catch((e) => {
  console.error('[phase-2] FATAL', e?.message ?? e);
  process.exit(1);
});

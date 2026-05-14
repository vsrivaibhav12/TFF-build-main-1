/**
 * Apply v3.3 schema migration via the Supabase Management API.
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
  const sql = fs.readFileSync(path.join(process.cwd(), 'db', 'schema-v3-3.sql'), 'utf8');
  console.log(`[v3-3] applying ${sql.length} bytes of SQL`);

  // Split by semicolons that end statements outside of DO $$ ... $$ blocks.
  // Simple approach: send as one batch — Supabase Management API supports multi-statement bodies.
  await runSql(sql, 'v3.3 main');
  console.log('[v3-3] applied OK');

  // Verify a few representative new tables exist
  const verify = await runSql(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND table_name IN (
           'profit_centres','cost_centres','billing_entities','user_billing_entity_access',
           'compliance_calendar_rules','client_compliance_profiles','compliance_calendar_events',
           'document_requests','sub_service_document_request_templates',
           'task_custom_field_definitions','task_custom_field_values',
           'task_labels','task_label_assignments','task_workdone'
         )
       ORDER BY table_name;`,
    'verify-tables',
  );
  console.log('[v3-3] tables verified:', verify);

  // Verify task columns
  const colVerify = await runSql(
    `SELECT column_name FROM information_schema.columns
       WHERE table_name='tasks'
         AND column_name IN (
           'is_blocked_on_client','is_stuck','stuck_reason_code','client_approval_required',
           'verification_status','verified_by_user_id','profit_centre_code','billing_entity_id',
           'estimated_hours'
         )
       ORDER BY column_name;`,
    'verify-task-cols',
  );
  console.log('[v3-3] task columns verified:', colVerify);

  // Verify inward_outward_register is gone
  const dropVerify = await runSql(
    `SELECT COUNT(*)::text AS c FROM information_schema.tables
       WHERE table_schema='public' AND table_name='inward_outward_register';`,
    'verify-iow-dropped',
  );
  console.log('[v3-3] inward_outward dropped check:', dropVerify);

  console.log('[v3-3] DONE');
}

main().catch((e) => {
  console.error('[v3-3] FATAL', e?.message ?? e);
  process.exit(1);
});

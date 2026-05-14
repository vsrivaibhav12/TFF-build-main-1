/**
 * Seed compliance_calendar_rules from db/seed-compliance-rules.sql.
 * Idempotent (ON CONFLICT DO NOTHING).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';
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
  if (!res.ok) throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 1500)}`);
  return text;
}

async function main() {
  const sql = fs.readFileSync(path.join(process.cwd(), 'db', 'seed-compliance-rules.sql'), 'utf8');
  await runSql(sql, 'seed-compliance-rules');
  const verify = await runSql(
    `SELECT COUNT(*)::text AS c, MIN(rule_code) AS first_code, MAX(rule_code) AS last_code FROM compliance_calendar_rules;`,
    'verify',
  );
  console.log('[seed-rules] applied:', verify);
}

main().catch((e) => {
  console.error('[seed-rules] FATAL', e?.message ?? e);
  process.exit(1);
});

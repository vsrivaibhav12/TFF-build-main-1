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
ALTER TABLE work_done ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE work_done ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
`;
  console.log('[work-done-time] adding started_at / ended_at');
  await runSql(sql, 'work-done-time');
  console.log('[work-done-time] done');
}

main().catch((e) => { console.error(e); process.exit(1); });

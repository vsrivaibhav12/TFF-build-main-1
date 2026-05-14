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
  // First, drop the old JSONB table if it exists
  await runSql(`DROP TABLE IF EXISTS bizlens_data CASCADE;`, 'drop old table');
  console.log('[bizlens] Dropped old bizlens_data table');

  const file = path.join(process.cwd(), 'db', 'schema-bizlens.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[bizlens] applying schema-bizlens.sql (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, 'schema-bizlens');

  // Grants
  const grants = `
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  `;
  await runSql(grants, 'grants');
  console.log('[bizlens] applied grants');
}

main().catch((e) => { console.error('[bizlens] FATAL', e?.message ?? e); process.exit(1); });

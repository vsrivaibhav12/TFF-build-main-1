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
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS direct_materials NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS direct_labor NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS packaging_logistics NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS other_variable NUMERIC DEFAULT 0;
    
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS rent_lease NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS salaries_fixed NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS utilities NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS marketing NUMERIC DEFAULT 0;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS admin_general NUMERIC DEFAULT 0;
    
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS customer_credit_policy TEXT;
    ALTER TABLE bizlens_data ADD COLUMN IF NOT EXISTS supplier_credit_policy TEXT;
  `;
  console.log('[bizlens-cols] adding detailed breakdown columns...');
  await runSql(sql, 'add-columns');
  console.log('[bizlens-cols] columns added successfully.');
}

main().catch((e) => { console.error('[bizlens-cols] FATAL', e?.message ?? e); process.exit(1); });

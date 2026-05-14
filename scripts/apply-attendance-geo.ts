import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return text;
}

async function main() {
  console.log('Adding geolocation columns to attendance_logs...');
  try {
    await runSql(`
      ALTER TABLE attendance_logs 
      ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC(10, 8),
      ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC(11, 8),
      ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC(10, 8),
      ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC(11, 8),
      ADD COLUMN IF NOT EXISTS check_in_address TEXT,
      ADD COLUMN IF NOT EXISTS check_out_address TEXT;
    `);
    console.log('Successfully added geolocation columns.');
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

main();

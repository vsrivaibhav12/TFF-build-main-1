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
  console.log('Adding custom_fields and labels to tasks...');
  try {
    await runSql(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';
    `);
    console.log('Successfully added custom_fields and labels.');
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

main();

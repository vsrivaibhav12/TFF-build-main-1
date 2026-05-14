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
  console.log('Creating work_done table...');
  try {
    await runSql(`
      CREATE TABLE IF NOT EXISTS work_done (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        minutes INT NOT NULL CHECK (minutes > 0),
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_work_done_user ON work_done(user_id);
      CREATE INDEX IF NOT EXISTS idx_work_done_date ON work_done(date);
      CREATE INDEX IF NOT EXISTS idx_work_done_task ON work_done(task_id);
      CREATE INDEX IF NOT EXISTS idx_work_done_client ON work_done(client_id);

      ALTER TABLE work_done ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "work_done_self" ON work_done;
      CREATE POLICY "work_done_self" ON work_done
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());

      DROP POLICY IF EXISTS "work_done_admin_all" ON work_done;
      CREATE POLICY "work_done_admin_all" ON work_done
        FOR ALL TO authenticated
        USING ((SELECT role FROM users_profile WHERE id = auth.uid()) = 'admin');
    `);
    console.log('Successfully created work_done table.');
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

main();

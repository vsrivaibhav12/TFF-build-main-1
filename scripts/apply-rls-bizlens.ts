/**
 * Applies a client-read RLS policy to bizlens_data.
 * Clients can only SELECT rows where client_id matches their client_users entry.
 * Safe to re-run (uses DROP POLICY IF EXISTS before CREATE POLICY).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import WS from 'ws';
(globalThis as any).WebSocket = WS;
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SQL = `
-- RLS on bizlens_data
ALTER TABLE bizlens_data ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "bizlens_admin_all" ON bizlens_data;
CREATE POLICY "bizlens_admin_all" ON bizlens_data
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Team: read + write for assigned clients only
DROP POLICY IF EXISTS "bizlens_team_read" ON bizlens_data;
CREATE POLICY "bizlens_team_read" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('team', 'admin')
    AND client_id IN (
      SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bizlens_team_write" ON bizlens_data;
CREATE POLICY "bizlens_team_write" ON bizlens_data
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('team', 'admin')
    AND client_id IN (
      SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('team', 'admin')
    AND client_id IN (
      SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
    )
  );

-- Client: read only, own data, published reports only
DROP POLICY IF EXISTS "bizlens_client_read" ON bizlens_data;
CREATE POLICY "bizlens_client_read" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND status = 'published'
    AND client_id IN (
      SELECT client_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );
`;

async function main() {
  console.log('[apply-rls-bizlens] Running...');
  const { error } = await (sb as any).rpc('exec_sql', { sql: SQL });
  if (error) {
    // Fallback: try via management API
    console.log('[apply-rls-bizlens] RPC unavailable, trying management API...');
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: SQL }),
      }
    );
    const body = await res.text();
    if (!res.ok) throw new Error(body);
    console.log('[apply-rls-bizlens] Done:', body);
  } else {
    console.log('[apply-rls-bizlens] Done via RPC');
  }
}

main().catch((e) => {
  console.error('[apply-rls-bizlens] FATAL', e?.message ?? e);
  process.exit(1);
});

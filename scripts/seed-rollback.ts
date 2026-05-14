/**
 * Reverse the demo seed.
 * Removes all rows tagged with PHASE0_DEMO marker / [DEMO] prefix.
 * Auth users are deleted from auth.users as well.
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

const SEED_EMAILS = [
  process.env.ADMIN_SEED_EMAIL || 'info@fiscalfulcrum.in',
  'team.demo@fiscalfulcrum.in',
  'client.demo@fiscalfulcrum.in',
];

async function main() {
  console.log('[seed-rollback] starting');

  // 1. delete tasks/etc tied to demo client
  const { data: demoClients } = await sb
    .from('clients')
    .select('id')
    .like('business_name', '[DEMO]%');
  const ids = (demoClients ?? []).map((c) => c.id);
  if (ids.length) {
    await sb.from('tasks').delete().in('client_id', ids);
    await sb.from('client_users').delete().in('client_id', ids);
    await sb.from('team_client_assignment').delete().in('client_id', ids);
    await sb.from('clients').delete().in('id', ids);
  }
  await sb.from('client_groups').delete().like('name', '[DEMO]%');
  // service_categories was seeded by schema.sql DDL itself \u2014 do not delete.

  // 2. delete profiles + auth users
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const targets = (list?.users ?? []).filter((u) =>
    SEED_EMAILS.includes((u.email || '').toLowerCase())
  );
  for (const u of targets) {
    await sb.from('users_profile').delete().eq('id', u.id);
    await sb.auth.admin.deleteUser(u.id);
    console.log(`[seed-rollback] removed ${u.email}`);
  }

  console.log('[seed-rollback] DONE');
}

main().catch((e) => {
  console.error('[seed-rollback] FATAL', e?.message ?? e);
  process.exit(1);
});

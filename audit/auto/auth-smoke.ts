import * as dotenv from 'dotenv';
dotenv.config({ path: '/app/.env.local' });
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { realtime: { transport: ws as any } });
async function main() {
  // count users
  const { data: users, error: ue } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (ue) { console.error('listUsers err', ue); process.exit(1); }
  console.log(`Auth users: ${users.users.length}`);
  for (const u of users.users.slice(0, 10)) console.log(`  - ${u.email} (${u.id.slice(0,8)})`);
  // can we read users_profile?
  const { data: profs, error: pe } = await sb.from('users_profile').select('id, full_name, role').limit(10);
  console.log(`\nusers_profile rows: ${profs?.length ?? 0}${pe ? ' err='+pe.message : ''}`);
  for (const p of profs ?? []) console.log(`  - ${(p as any).full_name} (${(p as any).role})`);
  // try login with admin creds
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { realtime: { transport: ws as any } });
  const { data: sess, error: se } = await sbAnon.auth.signInWithPassword({ email: 'info@fiscalfulcrum.in', password: 'Admin@TFF2026' });
  console.log(`\nAdmin login: ${se ? 'FAIL: '+se.message : 'OK token='+sess.session?.access_token.slice(0,20)+'...'}`);
  // try team login
  const { data: ts, error: te } = await sbAnon.auth.signInWithPassword({ email: 'team.demo@fiscalfulcrum.in', password: 'Team@TFF2026' });
  console.log(`Team login: ${te ? 'FAIL: '+te.message : 'OK'}`);
  // try client login
  const { data: cs, error: ce } = await sbAnon.auth.signInWithPassword({ email: 'client.demo@fiscalfulcrum.in', password: 'Client@TFF2026' });
  console.log(`Client login: ${ce ? 'FAIL: '+ce.message : 'OK'}`);

  // sanity: try the broken query_replies and dsc tables
  const { error: qrErr } = await sb.from('query_replies').select('id').limit(1);
  console.log(`\nquery_replies select: ${qrErr ? 'FAIL: '+qrErr.message : 'unexpectedly OK'}`);
  const { error: dscErr } = await sb.from('dsc').select('id').limit(1);
  console.log(`dsc select: ${dscErr ? 'FAIL: '+dscErr.message : 'unexpectedly OK'}`);
}
main().catch(e => { console.error(e); process.exit(1); });

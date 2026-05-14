/**
 * One-off patch script: enables all portal modules for every client
 * whose portal_enabled=true but is missing visibility rows.
 * Safe to re-run (uses upsert).
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

const ALL_MODULES = [
  'portal.dashboard', 'portal.tasks', 'portal.documents', 'portal.queries',
  'portal.bizlens', 'portal.vcfo', 'portal.compliance_calendar', 'portal.insights',
  'portal.tax_projection', 'portal.notices', 'portal.vendors',
];

async function main() {
  console.log('[patch-visibility] Starting...');

  // Fetch all portal-enabled clients
  const { data: clients, error: cErr } = await sb
    .from('clients')
    .select('id, business_name')
    .eq('portal_enabled', true);
  if (cErr) throw cErr;
  console.log(`[patch-visibility] Found ${clients?.length ?? 0} portal-enabled clients`);

  for (const client of clients ?? []) {
    const rows = ALL_MODULES.map((m) => ({
      client_id: client.id,
      module_key: m,
      is_enabled: true,
    }));
    const { error } = await sb
      .from('client_portal_visibility')
      .upsert(rows, { onConflict: 'client_id,module_key', ignoreDuplicates: false });
    if (error) {
      console.error(`  [ERROR] ${client.business_name}: ${error.message}`);
    } else {
      console.log(`  [OK] ${client.business_name}: all ${ALL_MODULES.length} modules enabled`);
    }
  }

  console.log('[patch-visibility] Done.');
}

main().catch((e) => {
  console.error('[patch-visibility] FATAL', e?.message ?? e);
  process.exit(1);
});

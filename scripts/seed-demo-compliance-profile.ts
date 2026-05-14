/**
 * Seed a compliance profile for the demo client so the calendar shows events.
 * Idempotent.
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
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: client } = await sb
    .from('clients')
    .select('id, business_name')
    .eq('business_name', '[DEMO] Demo Manufacturing Pvt Ltd')
    .maybeSingle();
  if (!client) throw new Error('demo client not found, run scripts/seed.ts first');

  const profile = {
    client_id: client.id,
    gst_filing_frequency: 'monthly',
    state_group: 'B', // Tamil Nadu
    entity_type: 'company',
    is_audit_applicable: true,
    is_tds_deductor: true,
    is_tcs_collector: false,
    is_advance_tax_applicable: true,
    is_pf_applicable: true,
    is_esi_applicable: true,
    is_pt_applicable: true,
    pt_state: 'TN',
    is_roc_applicable: true,
    agm_date: '2026-09-15',
    is_transfer_pricing: false,
    annual_turnover_estimate: 50000000,
    fy_start_month: 4,
  };
  const { error } = await sb.from('client_compliance_profiles').upsert(profile, { onConflict: 'client_id' });
  if (error) throw error;
  console.log('[seed-ccp] profile saved for', client.id);

  // Refresh events directly via SQL — simpler than importing the engine here.
  // We'll just call the engine via a HTTP-style call to our API, or alternatively
  // call refreshComplianceEvents directly. Easiest: call via fetch to local Next.
  // For seed-time, we'll insert a placeholder run by invoking the cron route with secret.
  console.log('[seed-ccp] now run: curl /api/cron/refresh-compliance-events?secret=$CRON_SECRET');
}

main().catch((e) => { console.error('[seed-ccp] FATAL', e?.message ?? e); process.exit(1); });

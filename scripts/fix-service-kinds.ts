import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('[service-fix] starting');

  // 1. Check services
  const { data: services } = await sb
    .from('services')
    .select('id, code, name, service_kind');

  console.log('[service-fix] Current services:');
  console.table(services);

  // 2. Map codes to kinds
  const MAPPING: Record<string, string> = {
    'CAAS': 'compliance',
    'BIZLENS': 'bizlens',
    'VCFO': 'vcfo',
    'CBAM': 'other',
    'SOX': 'other'
  };

  for (const s of services ?? []) {
    const targetKind = MAPPING[s.code];
    if (targetKind && s.service_kind !== targetKind) {
      console.log(`[service-fix] Updating ${s.code} -> kind=${targetKind}`);
      await sb.from('services').update({ service_kind: targetKind }).eq('id', s.id);
    }
  }

  console.log('[service-fix] DONE');
}

main().catch(console.error);

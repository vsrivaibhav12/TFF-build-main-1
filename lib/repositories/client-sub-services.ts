import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listClientSubServices(clientId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('client_sub_services')
    .select('id, sub_service_id, sub_services(id, code, name, frequency, services(name))')
    .eq('client_id', clientId)
    .eq('is_active', true);
  return data ?? [];
}

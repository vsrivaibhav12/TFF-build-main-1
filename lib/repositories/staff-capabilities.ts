import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Capability } from '@/lib/auth/capabilities';

export async function listGrantedCapabilities(userId: string): Promise<Capability[]> {
  const sb = createClient();
  const { data } = await sb
    .from('staff_capabilities')
    .select('capability')
    .eq('user_id', userId)
    .is('revoked_at', null);
  return (data ?? []).map((r: any) => r.capability as Capability);
}

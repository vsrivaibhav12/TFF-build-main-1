import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { PortalModule } from '@/lib/auth/portal-visibility';
import { PORTAL_MODULES } from '@/lib/auth/portal-visibility';

export interface VisibilityRow {
  id: string;
  module_key: PortalModule;
  is_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export async function listClientVisibility(clientId: string): Promise<Record<PortalModule, boolean>> {
  const sb = createClient();
  const { data } = await sb
    .from('client_portal_visibility')
    .select('module_key, is_enabled')
    .eq('client_id', clientId);
  const out: Record<string, boolean> = {};
  for (const m of PORTAL_MODULES) out[m] = false;
  out['portal.dashboard'] = true; // dashboard always visible
  for (const r of data ?? []) {
    out[(r as any).module_key] = !!(r as any).is_enabled;
  }
  return out as Record<PortalModule, boolean>;
}

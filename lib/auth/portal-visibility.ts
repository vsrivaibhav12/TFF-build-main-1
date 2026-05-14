import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export const PORTAL_MODULES = [
  'portal.dashboard', 'portal.tasks', 'portal.documents', 'portal.queries',
  'portal.bizlens', 'portal.vcfo', 'portal.compliance_calendar', 'portal.insights',
  'portal.tax_projection', 'portal.notices', 'portal.vendors',
] as const;
export type PortalModule = typeof PORTAL_MODULES[number];

/**
 * Maps portal modules to their required service codes.
 * If a module is not in this map, it's available to all portal-enabled clients.
 */
const MODULE_TO_SERVICE_CODE: Record<string, string> = {
  'portal.bizlens': 'BIZLENS',
  'portal.insights': 'BIZLENS',
  'portal.vcfo': 'VCFO',
  'portal.tax_projection': 'VCFO',
  'portal.compliance_calendar': 'CAAS',
  'portal.notices': 'CAAS',
  'portal.vendors': 'CAAS',
};

/**
 * Returns the set of enabled module keys across ALL clients linked to the user.
 * portal.dashboard is always implicitly visible.
 *
 * v3 Logic: Intersect client_portal_visibility (admin overrides) with
 * client_services (commercial subscription).
 */
export async function getVisibleModulesForCurrentClient(): Promise<Set<PortalModule>> {
  const sb = createClient();

  // 1. Get current client(s)
  const { data: cu } = await sb
    .from('client_users')
    .select('client_id')
    .eq('is_active', true);
  const clientIds = (cu ?? []).map(r => r.client_id);
  if (clientIds.length === 0) return new Set(['portal.dashboard']);

  // 2. Get active services for these clients
  const { data: services } = await sb
    .from('client_services')
    .select('service_id, services!inner(code)')
    .in('client_id', clientIds)
    .eq('is_active', true);
  const activeServiceCodes = new Set((services ?? []).map((s: any) => s.services.code));

  // 3. Get admin-enabled overrides
  const { data: visibility } = await sb
    .from('client_portal_visibility')
    .select('module_key, is_enabled')
    .in('client_id', clientIds);
  
  const overrides = new Map<string, boolean>();
  for (const v of visibility ?? []) {
    overrides.set(v.module_key, v.is_enabled);
  }

  const out = new Set<PortalModule>();
  out.add('portal.dashboard');

  // Core modules are enabled by default UNLESS explicitly disabled
  const CORE_MODULES: PortalModule[] = ['portal.tasks', 'portal.documents', 'portal.queries', 'portal.compliance_calendar'];
  for (const cm of CORE_MODULES) {
    if (overrides.get(cm) !== false) {
      out.add(cm);
    }
  }

  // Service-gated modules
  for (const m of PORTAL_MODULES) {
    if (out.has(m)) continue;
    
    const requiredService = MODULE_TO_SERVICE_CODE[m];
    const isSubscribed = requiredService && activeServiceCodes.has(requiredService);
    const isAdminEnabled = overrides.get(m) === true;

    // Logic: Enable if (Subscribed AND not explicitly disabled) OR (Explicitly enabled by Admin)
    if ((isSubscribed && overrides.get(m) !== false) || isAdminEnabled) {
      out.add(m);
    }
  }

  return out;
}

export async function ensureModuleVisible(key: PortalModule): Promise<void> {
  if (key === 'portal.dashboard') return;
  const set = await getVisibleModulesForCurrentClient();
  if (!set.has(key)) notFound();
}

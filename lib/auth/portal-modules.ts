/**
 * Portal module visibility resolver.
 * Maps client plan tier → default visible modules.
 * Admin can override per client via `portal_modules` JSONB.
 */

export const PORTAL_MODULES = [
  'dashboard',
  'tasks',
  'queries',
  'documents',
  'calendar',
  'notices',
  'bizlens',
  'vcfo',
  'projection',
] as const;

export type PortalModule = typeof PORTAL_MODULES[number];

const PLAN_DEFAULTS: Record<string, PortalModule[]> = {
  caas_starter:   ['dashboard', 'tasks', 'queries', 'documents', 'calendar', 'notices'],
  caas_growth:    ['dashboard', 'tasks', 'queries', 'documents', 'calendar', 'notices'],
  caas_enterprise:['dashboard', 'tasks', 'queries', 'documents', 'calendar', 'notices'],
  bizlens_only:   ['dashboard', 'bizlens'],
  vcfo_essential: ['dashboard', 'tasks', 'queries', 'documents', 'calendar', 'notices', 'bizlens', 'vcfo', 'projection'],
  vcfo_growth:    ['dashboard', 'tasks', 'queries', 'documents', 'calendar', 'notices', 'bizlens', 'vcfo', 'projection'],
  vcfo_premium:   ['dashboard', 'tasks', 'queries', 'documents', 'calendar', 'notices', 'bizlens', 'vcfo', 'projection'],
  process_controls:['dashboard', 'tasks', 'documents', 'calendar'],
  cbam_esg:       ['dashboard', 'tasks', 'documents', 'calendar'],
};

export function resolvePortalModules(planTier: string, override: PortalModule[] | null | undefined): PortalModule[] {
  const defaults = PLAN_DEFAULTS[planTier] ?? PLAN_DEFAULTS.caas_growth;
  if (override && Array.isArray(override) && override.length > 0) {
    return override.filter((m) => PORTAL_MODULES.includes(m as PortalModule)) as PortalModule[];
  }
  return defaults;
}

export function isModuleVisible(module: PortalModule, planTier: string, override?: PortalModule[] | null): boolean {
  return resolvePortalModules(planTier, override).includes(module);
}

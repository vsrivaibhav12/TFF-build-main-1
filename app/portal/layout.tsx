import { requireRole } from '@/lib/auth/require-role';
import { getVisibleModulesForCurrentClient } from '@/lib/auth/portal-visibility';
import AppShell, { type NavItem } from '@/components/shell/app-shell';
import MobileBottomNav from '@/components/shell/mobile-bottom-nav';

// v3 portal sidebar order: Dashboard · Compliance Calendar · Tasks · Documents · BizLens · vCFO · Queries · Notices.
const FULL_NAV: Array<NavItem & { gate?: string }> = [
  { href: '/portal',           label: 'Dashboard',           icon: 'layout',     gate: 'portal.dashboard' },
  { href: '/portal/calendar',  label: 'Compliance Calendar', icon: 'calendar',   gate: 'portal.compliance_calendar' },
  { href: '/portal/tasks',     label: 'Work Status',         icon: 'briefcase',  gate: 'portal.tasks' },
  { href: '/portal/documents', label: 'Documents',           icon: 'file',       gate: 'portal.documents' },
  { href: '/portal/bizlens',   label: 'BizLens',             icon: 'chart',      gate: 'portal.bizlens' },
  { href: '/portal/vcfo',      label: 'vCFO',                icon: 'trending',   gate: 'portal.vcfo' },
  { href: '/portal/queries',   label: 'Queries',             icon: 'message',    gate: 'portal.queries' },
  { href: '/portal/notices',   label: 'Notices',             icon: 'scroll',     gate: 'portal.notices' },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('client');
  const visible = await getVisibleModulesForCurrentClient();
  const nav = FULL_NAV.filter((n) => !n.gate || visible.has(n.gate as any)).map(({ gate, ...rest }) => rest);
  return (
    <AppShell user={user} role="client" nav={nav}>
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileBottomNav />
    </AppShell>
  );
}

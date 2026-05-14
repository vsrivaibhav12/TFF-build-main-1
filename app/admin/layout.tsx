import { requireRole } from '@/lib/auth/require-role';
import AppShell from '@/components/shell/app-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');
  return (
    <AppShell
      user={user}
      role="admin"
      nav={[
        // 9 grouped sections per TFF Rebuild Plan v1.0 §5.1
        { href: '/admin',                    label: 'Dashboard',          icon: 'dashboard' },
        { href: '/admin/compliance',         label: 'Compliance',         icon: 'chart' },
        { href: '/admin/clients',            label: 'Clients',            icon: 'users' },
        { href: '/admin/services',           label: 'Services',           icon: 'settings' },
        { href: '/admin/tasks',              label: 'Tasks',              icon: 'briefcase' },
        { href: '/admin/bizlens',            label: 'BizLens',            icon: 'chart',     section: 'Work modules' },
        { href: '/admin/vcfo',               label: 'vCFO',               icon: 'trending',   section: 'Work modules' },
        { href: '/admin/tax-projections',    label: 'Tax projections',    icon: 'calculator', section: 'Work modules' },
        { href: '/admin/gst',                label: 'GST',                icon: 'file',       section: 'Work modules' },
        { href: '/admin/billing',            label: 'Billing',            icon: 'receipt',    section: 'Work modules' },
        { href: '/admin/team',               label: 'Team',               icon: 'shield' },
        { href: '/admin/hr',                 label: 'HR',                 icon: 'clipboard' },
        { href: '/admin/notices',            label: 'Notices',            icon: 'scroll',     section: 'Operations' },
        { href: '/admin/hearings',           label: 'Hearings',           icon: 'gavel',      section: 'Operations' },
        { href: '/admin/work-done',          label: 'Work done',          icon: 'clipboard',  section: 'Operations' },
        { href: '/admin/reports/workdone',   label: 'Workdone',           icon: 'file',       section: 'Reports' },
        { href: '/admin/reports/client-services', label: 'Client services', icon: 'users',     section: 'Reports' },
        { href: '/admin/reports/pending-billing', label: 'Pending billing', icon: 'receipt',   section: 'Reports' },
        { href: '/admin/reports/service-wise', label: 'Service wise', icon: 'layers', section: 'Reports' },
        { href: '/admin/reports/group-wise', label: 'Group wise', icon: 'group', section: 'Reports' },
        { href: '/admin/settings',           label: 'Settings',           icon: 'settings',  section: 'Configuration' },
        { href: '/account/notifications',    label: 'Notifications',      icon: 'bell',      section: 'Configuration' },
      ]}
    >
      <div data-admin-only>{children}</div>
    </AppShell>
  );
}

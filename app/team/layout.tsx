import { requireRole } from '@/lib/auth/require-role';
import AppShell from '@/components/shell/app-shell';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['team', 'admin']);
  return (
    <AppShell
      user={user}
      role="team"
      nav={[
        // 7 items per TFF Rebuild Plan v1.0 §6.2
        { href: '/team',            label: 'My Workspace',  icon: 'dashboard' },
        { href: '/team/clients',    label: 'My Clients',    icon: 'users' },
        { href: '/team/tasks',      label: 'My Tasks',      icon: 'briefcase' },
        { href: '/team/documents',  label: 'Documents',     icon: 'file' },
        { href: '/team/queries',    label: 'Queries',       icon: 'message' },
        { href: '/team/attendance', label: 'Attendance',    icon: 'clipboard' },
        { href: '/team/leave',      label: 'Leave',         icon: 'clipboard' },
        { href: '/account/notifications', label: 'Notifications', icon: 'bell' },
      ]}
    >
      {children}
    </AppShell>
  );
}

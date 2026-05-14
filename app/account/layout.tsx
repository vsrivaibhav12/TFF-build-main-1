import { requireRole } from '@/lib/auth/require-role';
import AppShell from '@/components/shell/app-shell';

/**
 * /account/* is reachable from any role.
 * Sidebar nav is intentionally minimal - this section is preferences-only.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['admin', 'team', 'client']);
  const role = user.role;
  return (
    <AppShell
      user={user}
      role={role}
      nav={[
        { href: '/account/notifications', label: 'Notifications', icon: 'message' },
        {
          href: role === 'admin' ? '/admin' : role === 'team' ? '/team' : '/portal',
          label: 'Back to app',
          icon: 'layout',
        },
      ]}
    >
      {children}
    </AppShell>
  );
}

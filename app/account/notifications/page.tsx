import { listNotifications, getNotificationPreferences } from '@/lib/repositories/notifications';
import { requireUser } from '@/lib/auth/require-role';
import NotificationPrefsForm from './prefs-form';
import NotificationList from './notification-list';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const me = await requireUser();
  const [items, prefs] = await Promise.all([
    listNotifications(me.id, 100),
    getNotificationPreferences(me.id),
  ]);

  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="tff-page-title">Notification center</h1>
        <p className="tff-page-subtitle">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.` : 'All caught up.'}
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold">Email digest</h2>
        <NotificationPrefsForm initial={prefs as any} />
      </section>

      <section>
        <NotificationList items={items as any} />
      </section>
    </div>
  );
}

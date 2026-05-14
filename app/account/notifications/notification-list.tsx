'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, CheckCheck, Bell, Briefcase, FileText, MessageSquare, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/actions/notifications';

interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  task_assigned: { icon: <Briefcase className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
  task_due_soon: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
  task_completed: { icon: <Check className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  task_overdue: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
  document_uploaded: { icon: <FileText className="h-4 w-4" />, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
  query_received: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
  compliance_due: { icon: <ShieldCheck className="h-4 w-4" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
  payment_reminder: { icon: <Bell className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  team_alert: { icon: <User className="h-4 w-4" />, color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-100' },
  system_alert: { icon: <Bell className="h-4 w-4" />, color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-100' },
  other: { icon: <Bell className="h-4 w-4" />, color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-100' },
};

function typeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.other;
}

export default function NotificationList({ items: initial }: { items: NotificationItem[] }) {
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = items.filter(n => filter === 'unread' ? !n.is_read : true);
  const unreadCount = items.filter(n => !n.is_read).length;

  function markOne(id: string) {
    startTransition(async () => {
      const r = await markNotificationReadAction(id);
      if (r.success) {
        setItems(items.map(n => n.id === id ? { ...n, is_read: true } : n));
      } else {
        toast.error(r.error);
      }
    });
  }

  function markAll() {
    startTransition(async () => {
      const r = await markAllNotificationsReadAction();
      if (r.success) {
        setItems(items.map(n => ({ ...n, is_read: true })));
        toast.success('All marked as read');
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
          <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unread')}>
            Unread {unreadCount > 0 && <span className="ml-1 text-xs">({unreadCount})</span>}
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAll} disabled={pending}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 p-8 bg-zinc-50 text-sm text-zinc-500 text-center">
          {filter === 'unread' ? 'No unread notifications.' : 'Nothing yet. Activity from your tasks, queries, documents and compliance will appear here.'}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white divide-y">
          {filtered.map((n) => {
            const meta = typeMeta(n.notification_type);
            return (
              <div key={n.id} data-testid={`notification-item-${n.id}`} className={`flex items-start gap-3 p-4 ${n.is_read ? 'opacity-70' : ''}`}>
                <div className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-zinc-900">{n.title}</div>
                    {!n.is_read && <Badge variant="teal" className="text-[10px] h-5">New</Badge>}
                  </div>
                  <div className="text-sm text-zinc-500 mt-0.5">{n.message}</div>
                  <div className="text-xs text-zinc-400 mt-1">{formatDateIST(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => markOne(n.id)} disabled={pending}>
                    <Check className="h-4 w-4 text-zinc-400" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type NotificationRow = {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export async function listNotifications(userId: string, limit = 30): Promise<NotificationRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('notifications')
    .select('id, user_id, notification_type, title, message, related_entity_type, related_entity_id, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const sb = createClient();
  const { count } = await sb
    .from('notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .eq('is_read', false);
  return count ?? 0;
}

export async function getNotificationPreferences(userId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('notification_preferences')
    .select('email_frequency, in_app_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? { email_frequency: 'daily', in_app_enabled: true };
}

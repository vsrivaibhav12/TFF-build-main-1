'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole, requireUser } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function markNotificationReadAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireUser();
    const sb = createClient();
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', me.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/account/notifications');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<void>> {
  try {
    const me = await requireUser();
    const sb = createClient();
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', me.id)
      .eq('is_read', false);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/account/notifications');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function saveNotificationPreferencesAction(input: {
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'off';
  in_app_enabled: boolean;
}): Promise<ActionResult<void>> {
  try {
    const me = await requireUser();
    const sb = createClient();
    const { error } = await sb.from('notification_preferences').upsert(
      {
        user_id: me.id,
        email_frequency: input.email_frequency,
        in_app_enabled: input.in_app_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) return fail(error.message, 'DB');
    revalidatePath('/account/notifications');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

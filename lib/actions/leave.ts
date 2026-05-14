'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';

const leaveSchema = z.object({
  leave_type: z.enum(['paid', 'sick', 'casual', 'comp', 'other']),
  from_date: z.string(),
  to_date: z.string(),
  reason: z.string().optional(),
});

export async function requestLeaveAction(input: z.infer<typeof leaveSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const parsed = leaveSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const days = Math.max(1, Math.round((new Date(parsed.data.to_date).getTime() - new Date(parsed.data.from_date).getTime()) / 86_400_000) + 1);
    const sb = createClient();
    const { data, error } = await sb
      .from('leave_requests')
      .insert({
        user_id: me.id,
        leave_type: parsed.data.leave_type,
        from_date: parsed.data.from_date,
        to_date: parsed.data.to_date,
        number_of_days: days,
        reason: parsed.data.reason,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');

    // Manager chain notification
    const { data: profile } = await sb.from('users_profile').select('manager_id, full_name').eq('id', me.id).maybeSingle();
    const managerId = (profile as any)?.manager_id;
    if (managerId) {
      await notify({
        user_id: managerId,
        type: 'team_alert',
        title: 'Leave request from team member',
        message: `${me.full_name ?? me.email} requested ${days} day(s) of ${parsed.data.leave_type} leave (${parsed.data.from_date} to ${parsed.data.to_date}).`,
        related_entity_type: 'leave_request',
        related_entity_id: data.id,
      });
    } else {
      // Fallback: notify all admins if no manager
      const { data: admins } = await sb.from('users_profile').select('id').eq('role', 'admin').eq('is_active', true);
      for (const a of admins ?? []) {
        await notify({
          user_id: (a as any).id,
          type: 'team_alert',
          title: 'Leave request (no manager)',
          message: `${me.full_name ?? me.email} requested ${days} day(s) of ${parsed.data.leave_type} leave (${parsed.data.from_date} to ${parsed.data.to_date}). No manager is assigned — review needed.`,
          related_entity_type: 'leave_request',
          related_entity_id: data.id,
        });
      }
    }

    revalidatePath('/team/leave');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function reviewLeaveAction(input: { id: string; approve: boolean; remarks?: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'leave.approve');
    const sb = createClient();
    const { data: row } = await sb.from('leave_requests').select('user_id, leave_type, from_date, to_date').eq('id', input.id).maybeSingle();
    if (!row) return fail('Not found', 'NOT_FOUND');
    const { error } = await sb
      .from('leave_requests')
      .update({ status: input.approve ? 'approved' : 'rejected', reviewed_by: me.id, reviewed_at: new Date().toISOString(), review_remarks: input.remarks })
      .eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    await notify({
      user_id: (row as any).user_id,
      type: 'team_alert',
      title: `Leave ${input.approve ? 'approved' : 'rejected'}`,
      message: `Your leave request from ${(row as any).from_date} to ${(row as any).to_date} was ${input.approve ? 'approved' : 'rejected'}.`,
      related_entity_type: 'leave_request',
      related_entity_id: input.id,
    });
    revalidatePath('/team/leave');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

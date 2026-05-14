'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const toggleSchema = z.object({
  step_id: z.string().uuid(),
  task_id: z.string().uuid(),
  completed: z.boolean(),
  completion_note: z.string().optional(),
});

export async function toggleTaskStepAction(input: z.infer<typeof toggleSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = toggleSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();

    // 24-hour stage-uncomplete guardrail (v3 #9):
    // When uncompleting (completed=false), require either:
    //   (a) admin role, OR
    //   (b) the same user who completed it AND within 24h of completion.
    if (!parsed.data.completed) {
      const { data: existing, error: fetchErr } = await sb
        .from('task_steps')
        .select('completed_at, completed_by')
        .eq('id', parsed.data.step_id)
        .maybeSingle();
      if (fetchErr) return fail(fetchErr.message, 'DB');
      if (existing?.completed_at) {
        const completedAt = new Date(existing.completed_at).getTime();
        const ageMs = Date.now() - completedAt;
        const within24h = ageMs <= 24 * 60 * 60 * 1000;
        const sameUser = existing.completed_by === me.id;
        const isAdmin = (me as any).role === 'admin';
        if (!isAdmin && !(sameUser && within24h)) {
          return fail(
            'Cannot uncomplete this step: only the user who signed it off can reopen it within 24 hours, or an admin can override.',
            'STEP_LOCKED',
          );
        }
      }
    }

    const update = parsed.data.completed
      ? {
          completed_at: new Date().toISOString(),
          completed_by: me.id,
          completion_note: parsed.data.completion_note ?? null,
        }
      : {
          completed_at: null,
          completed_by: null,
          completion_note: null,
        };
    const { error } = await sb.from('task_steps').update(update).eq('id', parsed.data.step_id);
    if (error) return fail(error.message, 'DB');

    // Activity entry so it shows in audit / activity timeline
    await sb.from('task_activity').insert({
      task_id: parsed.data.task_id,
      action: parsed.data.completed ? 'step_completed' : 'step_reopened',
      field_name: 'step',
      new_value: parsed.data.step_id,
      changed_by: me.id,
    });
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const addSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1).max(200),
});
export async function addAdHocTaskStepAction(input: z.infer<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = addSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    // Compute next order
    const { data: existing } = await sb.from('task_steps').select('step_order').eq('task_id', parsed.data.task_id).order('step_order', { ascending: false }).limit(1).maybeSingle();
    const next_order = ((existing as any)?.step_order ?? 0) + 1;
    const { data, error } = await sb.from('task_steps').insert({
      task_id: parsed.data.task_id,
      step_order: next_order,
      title: parsed.data.title,
      is_required: false,
      source_sop_step_id: null,
    }).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const updateStepSchema = z.object({
  step_id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
});
export async function updateTaskStepAction(input: z.infer<typeof updateStepSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = updateStepSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('task_steps').update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    }).eq('id', parsed.data.step_id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const deleteStepSchema = z.object({
  step_id: z.string().uuid(),
  task_id: z.string().uuid(),
});
export async function deleteTaskStepAction(input: z.infer<typeof deleteStepSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = deleteStepSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('task_steps').delete().eq('id', parsed.data.step_id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const reorderSchema = z.object({
  task_id: z.string().uuid(),
  step_ids: z.array(z.string().uuid()),
});
export async function reorderTaskStepsAction(input: z.infer<typeof reorderSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = reorderSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    for (let i = 0; i < parsed.data.step_ids.length; i++) {
      await sb.from('task_steps').update({ step_order: i + 1 }).eq('id', parsed.data.step_ids[i]);
    }
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

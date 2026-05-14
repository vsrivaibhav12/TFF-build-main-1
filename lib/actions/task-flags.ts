'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { setTaskBlockedOnClient, setTaskStuck, verifyTask } from '@/lib/services/task-service';
import { stuckReasonEnum } from '@/lib/validation/schemas';
import { requireCapability } from '@/lib/auth/require-capability';

const stuckSchema = z.object({
  task_id: z.string().uuid(),
  is_stuck: z.boolean(),
  reason_code: stuckReasonEnum.optional().nullable(),
  reason_note: z.string().max(500).optional().nullable(),
});

/** Toggle a task's stuck flag with a reason taxonomy. */
export async function setTaskStuckAction(input: z.infer<typeof stuckSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const parsed = stuckSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    if (parsed.data.is_stuck && !parsed.data.reason_code) {
      return fail('A reason is required when marking a task stuck', 'VALIDATION');
    }
    await setTaskStuck(
      parsed.data.task_id,
      parsed.data.is_stuck,
      me.id,
      parsed.data.reason_code,
      parsed.data.reason_note,
    );
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const blockSchema = z.object({
  task_id: z.string().uuid(),
  is_blocked_on_client: z.boolean(),
});

/** Toggle a task's awaiting-client flag. */
export async function setTaskBlockedOnClientAction(input: z.infer<typeof blockSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const parsed = blockSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    await setTaskBlockedOnClient(parsed.data.task_id, parsed.data.is_blocked_on_client, me.id);
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const verifySchema = z.object({
  task_id: z.string().uuid(),
  note: z.string().max(500).optional().nullable(),
});

/** Verify a completed task. Requires the verify_tasks capability. */
export async function verifyTaskAction(input: z.infer<typeof verifySchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'verify_tasks');
    const parsed = verifySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    await verifyTask(parsed.data.task_id, me.id, parsed.data.note);
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import * as workDoneRepo from '@/lib/repositories/work-done';

const workDoneSchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  date: z.string(),
  minutes: z.number().int().positive(),
  description: z.string().min(1),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
});

export async function addWorkDoneAction(input: z.infer<typeof workDoneSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = workDoneSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    await workDoneRepo.addWorkDoneRecord({
      ...parsed.data,
      user_id: me.id,
      task_id: parsed.data.task_id || undefined,
      client_id: parsed.data.client_id || undefined,
    });
    
    revalidatePath('/team/work-done');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteWorkDoneAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    await workDoneRepo.deleteWorkDoneRecord(id, me.id);
    revalidatePath('/team/work-done');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

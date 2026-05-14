'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const taskTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  sub_service_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'annually', 'on_demand']),
  due_day_of_month: z.number().int().min(1).max(31).optional().nullable(),
  estimated_days: z.number().int().min(1).optional().nullable(),
  default_assignee_id: z.string().uuid().optional().nullable(),
  default_reviewer_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function upsertTaskTemplateAction(input: z.infer<typeof taskTemplateSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'services.manage');
    const parsed = taskTemplateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const sb = createClient();
    const payload: any = { ...parsed.data, updated_at: new Date().toISOString() };
    if (!parsed.data.id) {
      delete payload.id;
      payload.created_at = new Date().toISOString();
    }
    const { data, error } = await sb.from('task_templates').upsert(payload).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok({ id: (data as any).id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteTaskTemplateAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    const { error } = await sb.from('task_templates').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const stepSchema = z.object({
  id: z.string().uuid().optional(),
  task_template_id: z.string().uuid(),
  step_order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  is_required: z.boolean().default(true),
  guidance_notes: z.string().optional(),
});

export async function upsertTaskTemplateStepAction(input: z.infer<typeof stepSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'services.manage');
    const parsed = stepSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const sb = createClient();
    const payload: any = { ...parsed.data, updated_at: new Date().toISOString() };
    if (!parsed.data.id) {
      delete payload.id;
      payload.created_at = new Date().toISOString();
    }
    const { data, error } = await sb.from('task_template_steps').upsert(payload).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok({ id: (data as any).id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteTaskTemplateStepAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    const { error } = await sb.from('task_template_steps').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function reorderTaskTemplateStepsAction({
  task_template_id,
  ids_in_order,
}: {
  task_template_id: string;
  ids_in_order: string[];
}): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    for (let i = 0; i < ids_in_order.length; i++) {
      await sb.from('task_template_steps').update({ step_order: i + 1 }).eq('id', ids_in_order[i]);
    }
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

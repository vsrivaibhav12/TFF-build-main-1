'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

// ---------- Definition CRUD (admin) ----------
const definitionSchema = z.object({
  service_id: z.string().uuid().optional().nullable(),
  sub_service_id: z.string().uuid().optional().nullable(),
  field_key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'lowercase letters, digits, underscores'),
  display_label: z.string().min(1),
  field_type: z.enum(['text', 'number', 'date', 'dropdown', 'boolean']),
  options_json: z.any().optional().nullable(),
  is_required: z.boolean().default(false),
  display_order: z.number().int().default(0),
}).refine((d) => d.service_id || d.sub_service_id, { message: 'Either service_id or sub_service_id is required' });

export async function createCustomFieldDefinitionAction(input: any): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole('admin');
    const parsed = definitionSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data, error } = await sb
      .from('task_custom_field_definitions')
      .insert(parsed.data)
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteCustomFieldDefinitionAction(id: string): Promise<ActionResult<void>> {
  try {
    await requireRole('admin');
    const sb = createClient();
    const { error } = await sb.from('task_custom_field_definitions').delete().eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

// ---------- Value upsert (team) ----------
const valueSchema = z.object({
  task_id: z.string().uuid(),
  definition_id: z.string().uuid(),
  value_text: z.string().optional().nullable(),
  value_number: z.number().optional().nullable(),
  value_date: z.string().optional().nullable(),
  value_bool: z.boolean().optional().nullable(),
});

export async function upsertCustomFieldValueAction(input: any): Promise<ActionResult<void>> {
  try {
    await requireRole(['admin', 'team']);
    const parsed = valueSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('task_custom_field_values').upsert(
      {
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'task_id,definition_id' },
    );
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

// ---------- Label CRUD (admin) ----------
const labelSchema = z.object({
  code: z.string().regex(/^[a-z0-9_]+$/, 'lowercase letters, digits, underscores').max(40),
  display_name: z.string().min(1).max(60),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

export async function createLabelAction(input: any): Promise<ActionResult<void>> {
  try {
    await requireRole('admin');
    const parsed = labelSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('task_labels').insert(parsed.data);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/labels');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deactivateLabelAction(code: string): Promise<ActionResult<void>> {
  try {
    await requireRole('admin');
    const sb = createClient();
    const { error } = await sb.from('task_labels').update({ is_active: false }).eq('code', code);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/labels');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

// ---------- Label assignment to task ----------
const toggleLabelSchema = z.object({
  task_id: z.string().uuid(),
  label_code: z.string().min(1),
  assigned: z.boolean(),
});

export async function toggleTaskLabelAction(input: any): Promise<ActionResult<void>> {
  try {
    await requireRole(['admin', 'team']);
    const parsed = toggleLabelSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');
    const sb = createClient();
    if (parsed.data.assigned) {
      const { error } = await sb
        .from('task_label_assignments')
        .upsert({ task_id: parsed.data.task_id, label_code: parsed.data.label_code }, { onConflict: 'task_id,label_code' });
      if (error) return fail(error.message, 'DB');
    } else {
      const { error } = await sb
        .from('task_label_assignments')
        .delete()
        .eq('task_id', parsed.data.task_id)
        .eq('label_code', parsed.data.label_code);
      if (error) return fail(error.message, 'DB');
    }
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

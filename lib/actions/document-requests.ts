'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { reconcileTaskBlock } from '@/lib/repositories/document-requests';
import { setTaskBlockedOnClient } from '@/lib/services/task-service';
import { notify } from '@/lib/services/notification-service';

const createSchema = z.object({
  task_id: z.string().uuid(),
  document_name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  is_required: z.boolean().default(true),
  due_date: z.string().date().optional().nullable(),
});

/**
 * Create a single document request. Auto-marks the task as blocked-on-client
 * if it isn't already.
 */
export async function createDocumentRequestAction(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'documents.upload');
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data: task } = await sb
      .from('tasks')
      .select('id, client_id, is_blocked_on_client')
      .eq('id', parsed.data.task_id)
      .maybeSingle();
    if (!task) return fail('Task not found', 'NOT_FOUND');

    const { data, error } = await sb
      .from('document_requests')
      .insert({
        task_id: parsed.data.task_id,
        client_id: (task as any).client_id,
        document_name: parsed.data.document_name,
        description: parsed.data.description ?? null,
        is_required: parsed.data.is_required,
        due_date: parsed.data.due_date ?? null,
        created_by: me.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');

    if (!(task as any).is_blocked_on_client) {
      await setTaskBlockedOnClient(parsed.data.task_id, true, me.id);
    }

    // Notify the client portal users
    const { data: clientUsers } = await sb
      .from('client_users')
      .select('user_id')
      .eq('client_id', (task as any).client_id)
      .eq('is_active', true);
    for (const u of clientUsers ?? []) {
      await notify({
        user_id: (u as any).user_id,
        type: 'document_request',
        title: `Document needed: ${parsed.data.document_name}`,
        message: parsed.data.description ?? 'Please upload from your portal at your earliest convenience.',
        related_entity_type: 'task',
        related_entity_id: parsed.data.task_id,
      });
    }

    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/portal/tasks/${parsed.data.task_id}`);
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const bulkFromTemplateSchema = z.object({
  task_id: z.string().uuid(),
  sub_service_id: z.string().uuid(),
});

/**
 * Seed document requests for a task from the sub_service template list.
 * Idempotent (skips templates already represented for this task).
 */
export async function seedDocumentRequestsFromTemplate(
  input: z.infer<typeof bulkFromTemplateSchema>,
): Promise<ActionResult<{ inserted: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'documents.upload');
    const parsed = bulkFromTemplateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data: task } = await sb
      .from('tasks')
      .select('id, client_id')
      .eq('id', parsed.data.task_id)
      .maybeSingle();
    if (!task) return fail('Task not found', 'NOT_FOUND');
    const { data: tmpls } = await sb
      .from('sub_service_document_request_templates')
      .select('document_name, description, is_required, display_order')
      .eq('sub_service_id', parsed.data.sub_service_id)
      .order('display_order', { ascending: true });
    if (!tmpls || tmpls.length === 0) return ok({ inserted: 0 });

    const { data: existing } = await sb
      .from('document_requests')
      .select('document_name')
      .eq('task_id', parsed.data.task_id);
    const existingNames = new Set((existing ?? []).map((r: any) => r.document_name));

    const rows = tmpls
      .filter((t: any) => !existingNames.has(t.document_name))
      .map((t: any) => ({
        task_id: parsed.data.task_id,
        client_id: (task as any).client_id,
        document_name: t.document_name,
        description: t.description ?? null,
        is_required: t.is_required ?? true,
        created_by: me.id,
      }));
    if (rows.length === 0) return ok({ inserted: 0 });
    const { error } = await sb.from('document_requests').insert(rows);
    if (error) return fail(error.message, 'DB');

    await setTaskBlockedOnClient(parsed.data.task_id, true, me.id);
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/portal/tasks/${parsed.data.task_id}`);
    return ok({ inserted: rows.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteDocumentRequestAction(input: { id: string; task_id: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'documents.delete');
    if (!input.id) return fail('id required', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('document_requests').delete().eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/portal/tasks/${input.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const fulfillSchema = z.object({
  request_id: z.string().uuid(),
  document_id: z.string().uuid().optional().nullable(),
});

/**
 * Mark a document request as fulfilled. Called by:
 * - the team manually (override)
 * - the client portal upload flow (passes the new document_id)
 * Auto-reconciles task block status when all required requests are fulfilled.
 */
export async function fulfillDocumentRequestAction(
  input: z.infer<typeof fulfillSchema>,
): Promise<ActionResult<{ unblocked: boolean }>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'documents.upload');
    const parsed = fulfillSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data: req } = await sb
      .from('document_requests')
      .select('id, task_id, client_id')
      .eq('id', parsed.data.request_id)
      .maybeSingle();
    if (!req) return fail('Request not found', 'NOT_FOUND');
    const { error } = await sb
      .from('document_requests')
      .update({
        fulfilled_at: new Date().toISOString(),
        fulfilled_by_document_id: parsed.data.document_id ?? null,
        fulfilled_by_user_id: me.id,
      })
      .eq('id', parsed.data.request_id);
    if (error) return fail(error.message, 'DB');

    await sb.from('task_activity').insert({
      task_id: (req as any).task_id,
      action: 'doc_request_fulfilled',
      field_name: 'document_request',
      new_value: parsed.data.request_id,
      changed_by: me.id,
    });

    const r = await reconcileTaskBlock((req as any).task_id);
    revalidatePath(`/team/tasks/${(req as any).task_id}`);
    revalidatePath(`/portal/tasks/${(req as any).task_id}`);
    return ok({ unblocked: r.unblocked });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

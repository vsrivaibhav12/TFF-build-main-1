'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';

const docSchema = z.object({
  client_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_url: z.string().min(1),
  file_size: z.number().optional(),
  file_type: z.string().optional(),
  document_category: z.string().optional(),
  document_period_month: z.number().int().min(1).max(12).optional(),
  document_period_year: z.number().int().optional(),
  visible_to_client: z.boolean().default(false),
  description: z.string().optional(),
});

export async function recordDocumentMetaAction(input: z.infer<typeof docSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'documents.upload');
    const parsed = docSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data, error } = await sb
      .from('documents')
      .insert({ ...parsed.data, uploaded_by: me.id, visible_to_team: true })
      .select('id, client_id')
      .single();
    if (error) return fail(error.message, 'DB');

    // Notify clients linked to this client_id when visible_to_client = true
    if (parsed.data.visible_to_client) {
      const { data: clientUsers } = await sb
        .from('client_users')
        .select('user_id')
        .eq('client_id', parsed.data.client_id)
        .eq('is_active', true);
      for (const cu of clientUsers ?? []) {
        await notify({
          user_id: (cu as any).user_id,
          type: 'document_uploaded',
          title: 'New document available',
          message: `${parsed.data.file_name} has been shared with you.`,
          related_entity_type: 'document',
          related_entity_id: (data as any).id,
        });
      }
    }

    revalidatePath('/team/documents');
    revalidatePath('/portal/documents');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function softDeleteDocumentAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'documents.delete');
    const sb = createClient();
    const { error } = await sb
      .from('documents')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: me.id })
      .eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/documents');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function setDocumentVisibilityAction(input: { id: string; visible_to_client: boolean }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'documents.upload');
    const sb = createClient();
    const { error } = await sb.from('documents').update({ visible_to_client: input.visible_to_client, updated_at: new Date().toISOString() }).eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/documents');
    revalidatePath('/portal/documents');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}


'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { reconcileTaskBlock } from '@/lib/repositories/document-requests';

/**
 * Portal-side upload tied to a document_request.
 * 1) Upload the file to the `documents` storage bucket under client/<id>/...
 * 2) Insert a `documents` metadata row, visible_to_team=true, visible_to_client=true.
 * 3) Mark the document_request fulfilled and link the document_id.
 * 4) Reconcile the task's is_blocked_on_client flag.
 */
export async function uploadDocumentForRequest(
  formData: FormData,
): Promise<ActionResult<{ document_id: string; unblocked: boolean }>> {
  try {
    const me = await requireRole(['client', 'admin']);
    const requestId = String(formData.get('request_id') ?? '');
    const taskId = String(formData.get('task_id') ?? '');
    const file = formData.get('file');
    if (!requestId || !taskId) return fail('request_id and task_id are required', 'VALIDATION');
    if (!(file instanceof File)) return fail('No file provided', 'VALIDATION');
    if (file.size === 0) return fail('Empty file', 'VALIDATION');
    if (file.size > 25 * 1024 * 1024) return fail('File exceeds 25 MB limit', 'VALIDATION');

    const sb = createClient();

    // Verify the request belongs to a task the user can see
    const { data: req, error: rErr } = await sb
      .from('document_requests')
      .select('id, task_id, client_id, document_name, fulfilled_at')
      .eq('id', requestId)
      .maybeSingle();
    if (rErr) return fail(rErr.message, 'DB');
    if (!req) return fail('Request not found', 'NOT_FOUND');
    if ((req as any).fulfilled_at) return fail('Already fulfilled', 'ALREADY_DONE');

    // Upload to storage
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const path = `client/${(req as any).client_id}/${requestId}/${Date.now()}-${safeName}`;
    const ab = await file.arrayBuffer();
    const { error: upErr } = await sb.storage
      .from('documents')
      .upload(path, Buffer.from(ab), {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
    if (upErr) return fail(`Upload failed: ${upErr.message}`, 'STORAGE');

    const { data: pub } = sb.storage.from('documents').getPublicUrl(path);

    // Insert metadata
    const { data: doc, error: docErr } = await sb
      .from('documents')
      .insert({
        client_id: (req as any).client_id,
        file_name: file.name,
        file_url: pub.publicUrl,
        file_size: file.size,
        file_type: file.type,
        description: `Submitted for: ${(req as any).document_name}`,
        visible_to_team: true,
        visible_to_client: true,
        uploaded_by: me.id,
      })
      .select('id')
      .single();
    if (docErr) return fail(`Metadata insert failed: ${docErr.message}`, 'DB');

    // Mark the request fulfilled
    const { error: upRequErr } = await sb
      .from('document_requests')
      .update({
        fulfilled_at: new Date().toISOString(),
        fulfilled_by_document_id: doc.id,
      })
      .eq('id', requestId);
    if (upRequErr) return fail(`Failed to mark fulfilled: ${upRequErr.message}`, 'DB');

    // Audit
    await sb.from('task_activity').insert({
      task_id: taskId,
      action: 'doc_request_uploaded',
      field_name: 'document_request',
      new_value: file.name.slice(0, 120),
      changed_by: me.id,
    });

    const r = await reconcileTaskBlock(taskId);

    revalidatePath(`/portal/tasks/${taskId}`);
    revalidatePath(`/team/tasks/${taskId}`);
    return ok({ document_id: doc.id, unblocked: r.unblocked });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

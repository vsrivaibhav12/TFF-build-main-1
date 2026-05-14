import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface DocumentRequest {
  id: string;
  task_id: string;
  client_id: string;
  document_name: string;
  description: string | null;
  is_required: boolean;
  due_date: string | null;
  fulfilled_at: string | null;
  fulfilled_by_document_id: string | null;
  fulfilled_by_user_id: string | null;
  fulfilled_by?: { full_name: string | null } | null;
  created_by: string;
  created_at: string;
}

export async function listDocumentRequestsForTask(taskId: string): Promise<DocumentRequest[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('document_requests')
    .select('*, fulfilled_by:fulfilled_by_user_id(full_name)')
    .eq('task_id', taskId)
    .order('is_required', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DocumentRequest[];
}

export async function listPendingDocumentRequestsForClient(
  clientId: string,
): Promise<Array<DocumentRequest & { task_title?: string | null }>> {
  const sb = createClient();
  const { data, error } = await sb
    .from('document_requests')
    .select('*, tasks(title, status, due_date)')
    .eq('client_id', clientId)
    .is('fulfilled_at', null)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, task_title: r.tasks?.title ?? null }));
}

/**
 * After any document_request mutation, check whether ALL required document
 * requests for the task are fulfilled. If so, auto-clear is_blocked_on_client
 * on the parent task and notify the assignee.
 */
export async function reconcileTaskBlock(taskId: string): Promise<{ unblocked: boolean }> {
  const sb = createClient();
  const { data: rows } = await sb
    .from('document_requests')
    .select('id, is_required, fulfilled_at')
    .eq('task_id', taskId);
  const required = (rows ?? []).filter((r: any) => r.is_required);
  if (required.length === 0) return { unblocked: false };
  const unfulfilled = required.filter((r: any) => !r.fulfilled_at).length;
  if (unfulfilled > 0) return { unblocked: false };
  const { data: task } = await sb
    .from('tasks')
    .select('id, is_blocked_on_client, assigned_to')
    .eq('id', taskId)
    .maybeSingle();
  if ((task as any)?.is_blocked_on_client) {
    await sb.from('tasks').update({
      is_blocked_on_client: false,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);
    await sb.from('task_activity').insert({
      task_id: taskId,
      action: 'auto_unblocked_documents_received',
      field_name: 'is_blocked_on_client',
      new_value: 'false',
      changed_by: null,
    });
    return { unblocked: true };
  }
  return { unblocked: false };
}

export async function listDocumentRequestTemplates(subServiceId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('sub_service_document_request_templates')
    .select('id, document_name, description, is_required, display_order')
    .eq('sub_service_id', subServiceId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

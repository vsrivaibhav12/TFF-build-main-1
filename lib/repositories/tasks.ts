import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { TaskStatus } from '@/lib/validation/schemas';

export async function listTasks(opts: {
  clientId?: string;
  assignedTo?: string;
  status?: Array<TaskStatus | 'blocked' | 'stuck'>;
  limit?: number;
} = {}) {
  const sb = createClient();
  let q = sb
    .from('tasks')
    .select('id, task_number, title, status, priority, due_date, period_year, period_month, period_quarter, assigned_to, reviewer_id, sub_service_id, client_id, is_blocked_on_client, is_stuck, stuck_reason_code, verification_status, is_billable, bill_reference, is_verified, created_at, updated_at, clients!tasks_client_id_fkey(id, business_name)')
    .eq('is_deleted', false)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.assignedTo) q = q.eq('assigned_to', opts.assignedTo);
  if (opts.status?.length) {
    // Pseudo-statuses 'blocked' and 'stuck' are flags, not enum values.
    const realStatuses = opts.status.filter((s): s is TaskStatus =>
      s === 'pending' || s === 'in_progress' || s === 'completed' || s === 'cancelled',
    );
    if (opts.status.includes('blocked')) q = q.eq('is_blocked_on_client', true);
    else if (opts.status.includes('stuck')) q = q.eq('is_stuck', true);
    else if (realStatuses.length > 0) q = q.in('status', realStatuses);
  }
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getTask(id: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('tasks')
    .select('*, clients!tasks_client_id_fkey(id, business_name), sub_services!tasks_sub_service_id_fkey(code, name, services!sub_services_service_id_fkey(name)), assignee:users_profile!tasks_assigned_to_fkey(id, full_name, email), reviewer:users_profile!tasks_reviewer_id_fkey(id, full_name, email)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listTaskActivity(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_activity')
    .select('id, action, field_name, old_value, new_value, created_at, users_profile!task_activity_changed_by_fkey(full_name, email)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTaskNotes(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_notes')
    .select('id, note_text, created_at, users_profile!task_notes_created_by_fkey(full_name, email, role)')
    .eq('task_id', taskId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function countTasksByStatus(opts: { assignedTo?: string; clientId?: string } = {}) {
  const sb = createClient();
  let q = sb.from('tasks').select('status').eq('is_deleted', false);
  if (opts.assignedTo) q = q.eq('assigned_to', opts.assignedTo);
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  const { data, error } = await q;
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    counts[(r as any).status] = (counts[(r as any).status] || 0) + 1;
  }
  return counts;
}

export async function createTaskRecord(payload: any) {
  const sb = createClient();
  const { data, error } = await sb.from('tasks').insert(payload).select('id').single();
  if (error) throw error;
  return data;
}

export async function updateTaskRecord(id: string, payload: any) {
  const sb = createClient();
  const { error } = await sb.from('tasks').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteTaskRecord(id: string, userId: string) {
  const sb = createClient();
  const { error } = await sb.from('tasks').update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
  }).eq('id', id);
  if (error) throw error;
}

export async function generateNextTaskNumber(): Promise<string> {
  const sb = createClient();
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `T-${yy}-`;
  const { data } = await sb
    .from('tasks')
    .select('task_number')
    .ilike('task_number', `${prefix}%`)
    .order('task_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastNum = data?.task_number ? parseInt(data.task_number.slice(-4), 10) : 0;
  const next = (lastNum + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
}

export async function addTaskActivity(payload: any) {
  const sb = createClient();
  const { error } = await sb.from('task_activity').insert(payload);
  if (error) throw error;
}

export async function addTaskNoteRecord(payload: any) {
  const sb = createClient();
  const { error } = await sb.from('task_notes').insert(payload);
  if (error) throw error;
}

export async function getTaskSteps(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select('id, is_required, completed_at')
    .eq('task_id', taskId);
  if (error) throw error;
  return data;
}

export async function getSubServiceRequiresVerification(subServiceId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('sub_services')
    .select('requires_verification')
    .eq('id', subServiceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

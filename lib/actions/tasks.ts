'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { createTaskSchema, transitionTaskSchema, updateTaskBillingSchema, updateTaskArnSchema, reopenTaskSchema, type CreateTaskInput, type TaskStatus } from '@/lib/validation/schemas';
import * as taskService from '@/lib/services/task-service';
import { canModifyTask, canCompleteTask } from '@/lib/services/task-modify-guard';
import * as taskRepo from '@/lib/repositories/tasks';
import { seedTaskStepsFromSop, seedTaskStepsFromTemplate } from '@/lib/services/task-steps-service';
import { notify } from '@/lib/services/notification-service';

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');
    
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const taskNumber = await taskRepo.generateNextTaskNumber();
    const data = await taskRepo.createTaskRecord({ 
      ...parsed.data, 
      task_number: taskNumber,
      status: 'pending',
      created_by: me.id,
      bill_amount: parsed.data.bill_amount ?? null,
      arn_reference: parsed.data.arn_reference || null,
      is_arn_client_visible: parsed.data.is_arn_client_visible ?? false,
    });
    
    await taskRepo.addTaskActivity({
      task_id: data.id,
      action: 'created',
      field_name: 'status',
      new_value: 'pending',
      changed_by: me.id,
    });
    
    // If linked to a task template, copy its steps onto the new task
    if (parsed.data.task_template_id) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const sb = createClient();
        await seedTaskStepsFromTemplate(sb as any, { task_id: data.id, task_template_id: parsed.data.task_template_id });
      } catch (e) {
        console.error('Template step seeding failed:', e);
      }
    } else if (parsed.data.sub_service_id) {
      // Fallback: copy SOP steps from sub-service for backward compatibility
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const sb = createClient();
        await seedTaskStepsFromSop(sb as any, { task_id: data.id, sub_service_id: parsed.data.sub_service_id });
      } catch (e) {
        console.error('SOP seeding failed:', e);
      }
    }
    
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    revalidatePath('/portal/tasks');
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    revalidatePath(`/admin/clients/${parsed.data.client_id}`);
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function transitionTaskAction(input: { task_id: string; to_status: TaskStatus; note?: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'tasks.complete');
    const parsed = transitionTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) {
      return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    }
    if (parsed.data.to_status === 'completed') {
      const check = canCompleteTask(task as any);
      if (!check.ok) return fail(check.reason, 'BILLING_REQUIRED');
    }
    
    await taskService.transitionTaskStatus({
      taskId: parsed.data.task_id,
      toStatus: parsed.data.to_status,
      performedBy: me.id,
      note: parsed.data.note,
    });
    
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/portal/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function addTaskNoteAction(input: { task_id: string; body: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'tasks.assign');
    if (!input.body || input.body.trim().length < 1) return fail('Note cannot be empty', 'VALIDATION');
    
    await taskService.addTaskNote(input.task_id, input.body.trim(), me.id);
    
    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    revalidatePath(`/portal/tasks/${input.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function assignTaskAction(input: { task_id: string; assigned_to?: string | null; reviewer_id?: string | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    
    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to || null;
    if (input.reviewer_id !== undefined) updates.reviewer_id = input.reviewer_id || null;
    
    await taskRepo.updateTaskRecord(input.task_id, updates);
    
    await taskRepo.addTaskActivity({
      task_id: input.task_id,
      action: 'assignment_changed',
      field_name: 'assignment',
      new_value: `assigned_to=${input.assigned_to ?? '-'} reviewer=${input.reviewer_id ?? '-'}`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function sendTaskReminderAction(input: { task_id: string; message?: string }): Promise<ActionResult<{ recipients: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    if (!input.task_id) return fail('task_id is required', 'VALIDATION');
    
    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!(task as any).is_blocked_on_client) {
      return fail('Reminders can only be sent for tasks waiting on the client', 'INVALID_STATE');
    }

    // Throttle: refuse if a reminder activity exists within the last 6h
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    // Manual query for activity check - maybe add to repo later
    const { createClient } = await import('@/lib/supabase/server');
    const sb = createClient();
    const { data: recent } = await sb
      .from('task_activity')
      .select('id, created_at')
      .eq('task_id', input.task_id)
      .eq('action', 'reminder_sent')
      .gte('created_at', sixHoursAgo)
      .limit(1);
      
    if (recent && recent.length > 0) {
      return fail('A reminder was already sent in the last 6 hours', 'THROTTLED');
    }

    // Find client portal users for this client
    const { data: clientUsers } = await sb
      .from('client_users')
      .select('user_id')
      .eq('client_id', (task as any).client_id)
      .eq('is_active', true);

    const userIds = (clientUsers ?? []).map((u: any) => u.user_id).filter(Boolean);
    const subject = `Reminder: ${(task as any).title}`;
    const body = input.message?.trim()
      || `We're waiting on inputs for "${(task as any).title}". Please respond at your earliest convenience.`;

    for (const uid of userIds) {
      await notify({
        user_id: uid,
        type: 'task_due_soon',
        title: subject,
        message: body,
        related_entity_type: 'task',
        related_entity_id: input.task_id,
        immediate: true,
      });
    }

    await taskRepo.addTaskActivity({
      task_id: input.task_id,
      action: 'reminder_sent',
      field_name: 'reminder',
      new_value: `${userIds.length} recipient${userIds.length === 1 ? '' : 's'}`,
      changed_by: me.id,
    });

    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok({ recipients: userIds.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTaskLabelsAction(taskId: string, labels: string[]): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    await taskRepo.updateTaskRecord(taskId, { labels, updated_at: new Date().toISOString() });
    
    await taskRepo.addTaskActivity({
      task_id: taskId,
      action: 'labels_updated',
      field_name: 'labels',
      new_value: labels.join(', '),
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${taskId}`);
    revalidatePath(`/admin/tasks/${taskId}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTaskCustomFieldsAction(taskId: string, fields: Record<string, any>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'manage_custom_fields');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    await taskRepo.updateTaskRecord(taskId, { custom_fields: fields, updated_at: new Date().toISOString() });
    
    await taskRepo.addTaskActivity({
      task_id: taskId,
      action: 'custom_fields_updated',
      field_name: 'custom_fields',
      new_value: JSON.stringify(fields),
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${taskId}`);
    revalidatePath(`/admin/tasks/${taskId}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}



export async function softDeleteTaskAction(taskId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    await taskRepo.softDeleteTaskRecord(taskId, me.id);
    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    revalidatePath('/portal/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTaskBillingAction(input: { task_id: string; is_billable: boolean; bill_reference?: string | null; bill_amount?: number | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const parsed = updateTaskBillingSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if ((task as any).is_deleted) {
      return fail('Deleted tasks cannot be modified', 'IMMUTABLE');
    }
    
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      is_billable: parsed.data.is_billable,
      bill_reference: parsed.data.bill_reference || null,
      bill_amount: parsed.data.bill_amount ?? null,
      updated_at: new Date().toISOString(),
    });
    
    await taskRepo.addTaskActivity({
      task_id: parsed.data.task_id,
      action: 'billing_updated',
      field_name: 'is_billable',
      new_value: `${parsed.data.is_billable}${parsed.data.bill_reference ? ` / ${parsed.data.bill_reference}` : ''}${parsed.data.bill_amount ? ` / ₹${parsed.data.bill_amount}` : ''}`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function markTaskBilledAction(taskId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!(task as any).is_billable) {
      return fail('Task is not billable', 'INVALID_STATE');
    }
    await taskRepo.updateTaskRecord(taskId, {
      billed: true,
      billed_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    });
    await taskRepo.addTaskActivity({
      task_id: taskId,
      action: 'marked_billed',
      field_name: 'billed',
      new_value: 'true',
      changed_by: me.id,
    });
    revalidatePath(`/team/tasks/${taskId}`);
    revalidatePath(`/admin/tasks/${taskId}`);
    revalidatePath('/admin/billing');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTaskArnAction(input: { task_id: string; arn_reference?: string | null; is_arn_client_visible?: boolean }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const parsed = updateTaskArnSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if ((task as any).is_deleted) {
      return fail('Deleted tasks cannot be modified', 'IMMUTABLE');
    }
    
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      arn_reference: parsed.data.arn_reference || null,
      is_arn_client_visible: parsed.data.is_arn_client_visible ?? false,
      updated_at: new Date().toISOString(),
    });
    
    await taskRepo.addTaskActivity({
      task_id: parsed.data.task_id,
      action: 'arn_updated',
      field_name: 'arn_reference',
      new_value: `${parsed.data.arn_reference || 'cleared'}${parsed.data.is_arn_client_visible ? ' (client visible)' : ''}`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function reopenTaskAction(input: { task_id: string; reason: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const parsed = reopenTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if ((task as any).is_deleted) {
      return fail('Deleted tasks cannot be reopened', 'IMMUTABLE');
    }
    if ((task as any).status !== 'completed') {
      return fail('Only completed tasks can be reopened', 'INVALID_STATE');
    }
    
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      status: 'in_progress',
      completed_date: null,
      verification_status: 'not_required',
      is_verified: false,
      verified_by_user_id: null,
      verified_at: null,
      updated_at: new Date().toISOString(),
    });
    
    await taskRepo.addTaskActivity({
      task_id: parsed.data.task_id,
      action: 'task_reopened',
      field_name: 'status',
      old_value: 'completed',
      new_value: `in_progress (reason: ${parsed.data.reason})`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

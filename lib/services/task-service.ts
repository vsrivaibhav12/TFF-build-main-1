import 'server-only';
import { ServiceError } from '@/lib/actions/result';
import type { TaskStatus } from '@/lib/validation/schemas';
import * as taskRepo from '@/lib/repositories/tasks';
import { canTransition } from '@/lib/services/task-transitions';
import { canModifyTask, canCompleteTask } from '@/lib/services/task-modify-guard';

export { canTransition, nextStatuses } from '@/lib/services/task-transitions';
export { canModifyTask, canCompleteTask } from '@/lib/services/task-modify-guard';

export interface TransitionInput {
  taskId: string;
  toStatus: TaskStatus;
  performedBy: string;
  note?: string;
}

export async function transitionTaskStatus(input: TransitionInput) {
  const task = await taskRepo.getTask(input.taskId);
  if (!task) throw new ServiceError('Task not found', 'NOT_FOUND');
  if (!canModifyTask(task as any)) {
    throw new ServiceError('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
  }
  
  if (input.toStatus === 'completed') {
    const check = canCompleteTask(task as any);
    if (!check.ok) throw new ServiceError(check.reason, 'BILLING_REQUIRED');
  }
  
  if (!canTransition(task.status as TaskStatus, input.toStatus)) {
    throw new ServiceError(
      `Cannot transition ${task.status} → ${input.toStatus}`,
      'INVALID_TRANSITION',
    );
  }

  // Sign-off gate when completing.
  if (input.toStatus === 'completed') {
    const stepRows = await taskRepo.getTaskSteps(input.taskId);
    const required = (stepRows ?? []).filter((r: any) => r.is_required);
    const incomplete = required.filter((r: any) => !r.completed_at).length;
    if (required.length > 0 && incomplete > 0) {
      throw new ServiceError(
        `Cannot complete: ${incomplete} required checklist step${incomplete > 1 ? 's' : ''} still pending sign-off`,
        'STEPS_INCOMPLETE',
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const updates: Record<string, any> = {
    status: input.toStatus,
    updated_at: new Date().toISOString(),
  };
  if (input.toStatus === 'in_progress' && !task.started_date) updates.started_date = today;
  if (input.toStatus === 'completed') {
    updates.completed_date = today;
    // Reset verification so re-completed tasks require verification again.
    updates.is_verified = false;
    updates.verified_by_user_id = null;
    updates.verified_at = null;
    updates.verification_status = 'pending';
  }

  await taskRepo.updateTaskRecord(input.taskId, updates);

  await taskRepo.addTaskActivity({
    task_id: input.taskId,
    action: 'status_changed',
    field_name: 'status',
    old_value: task.status,
    new_value: input.toStatus,
    changed_by: input.performedBy,
  });

  if (input.note && input.note.trim()) {
    await taskRepo.addTaskNoteRecord({
      task_id: input.taskId,
      note_text: input.note.trim(),
      created_by: input.performedBy,
    });
  }
}

export async function addTaskNote(taskId: string, body: string, performedBy: string) {
  await taskRepo.addTaskNoteRecord({
    task_id: taskId,
    note_text: body,
    created_by: performedBy,
  });
  
  await taskRepo.addTaskActivity({
    task_id: taskId,
    action: 'note_added',
    field_name: 'note',
    new_value: body.slice(0, 200),
    changed_by: performedBy,
  });
}

export async function setTaskBlockedOnClient(
  taskId: string,
  blocked: boolean,
  performedBy: string,
) {
  await taskRepo.updateTaskRecord(taskId, { 
    is_blocked_on_client: blocked, 
    updated_at: new Date().toISOString() 
  });
  
  await taskRepo.addTaskActivity({
    task_id: taskId,
    action: blocked ? 'blocked_on_client' : 'unblocked_from_client',
    field_name: 'is_blocked_on_client',
    new_value: blocked ? 'true' : 'false',
    changed_by: performedBy,
  });
}

export async function setTaskStuck(
  taskId: string,
  stuck: boolean,
  performedBy: string,
  reason?: string | null,
  note?: string | null,
) {
  const updates: Record<string, any> = {
    is_stuck: stuck,
    stuck_reason_code: stuck ? (reason ?? null) : null,
    stuck_reason_note: stuck ? (note ?? null) : null,
    updated_at: new Date().toISOString(),
  };
  
  await taskRepo.updateTaskRecord(taskId, updates);
  
  await taskRepo.addTaskActivity({
    task_id: taskId,
    action: stuck ? 'task_stuck' : 'task_unstuck',
    field_name: 'is_stuck',
    new_value: stuck ? `${reason ?? 'other'}: ${note ?? ''}`.slice(0, 200) : 'false',
    changed_by: performedBy,
  });
}

export async function verifyTask(taskId: string, performedBy: string, note?: string | null) {
  const task = await taskRepo.getTask(taskId);
  if (!task) throw new ServiceError('Task not found', 'NOT_FOUND');
  if ((task as any).status !== 'completed') {
    throw new ServiceError('Cannot verify: task is not completed yet', 'NOT_COMPLETED');
  }
  if ((task as any).verification_status === 'verified') {
    throw new ServiceError('Already verified', 'ALREADY_VERIFIED');
  }
  
  await taskRepo.updateTaskRecord(taskId, {
    verification_status: 'verified',
    is_verified: true,
    verified_by_user_id: performedBy,
    verified_at: new Date().toISOString(),
    verification_note: note ?? null,
    updated_at: new Date().toISOString(),
  });
  
  await taskRepo.addTaskActivity({
    task_id: taskId,
    action: 'task_verified',
    field_name: 'verification_status',
    new_value: 'verified',
    changed_by: performedBy,
  });
}

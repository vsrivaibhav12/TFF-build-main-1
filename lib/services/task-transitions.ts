/**
 * Pure task transition state machine (v3 collapsed enum).
 * Statuses: pending → in_progress → completed | cancelled.
 *
 * Old `awaiting_client` is now a flag (`is_blocked_on_client`) on tasks.
 * Old `review` collapsed into in_progress; verification is a separate field
 * (`verification_status`) handled by sub-services that opt in.
 *
 * No 'server-only' marker — safe to import from server and client code.
 */
import type { TaskStatus } from '@/lib/validation/schemas';

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled', 'pending'],
  completed: [],
  cancelled: ['pending'],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: TaskStatus): TaskStatus[] {
  return TRANSITIONS[from] ?? [];
}

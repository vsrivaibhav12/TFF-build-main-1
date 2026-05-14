/**
 * Map an internal task to the client-visible status (Group D simplification).
 * Pure function — safe to import from server or client code.
 *
 * Internal fields used:
 *   - status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
 *   - is_blocked_on_client: boolean
 *   - is_stuck: boolean
 *
 * Output: one of 6 client-friendly statuses. Portal must NEVER expose
 * internal status, reviewer name, SOP step counts, or assignee name.
 *
 * Group D mapping:
 *   pending              → Scheduled
 *   in_progress          → In Progress
 *   is_blocked_on_client → We Need Information from You
 *   review               → Under Review
 *   completed            → Done
 *   is_stuck             → On Hold
 */
export type ClientVisibleStatus =
  | 'scheduled'
  | 'we_need_info'
  | 'in_progress'
  | 'under_review'
  | 'done'
  | 'on_hold'
  | 'cancelled';

export interface TaskForClientView {
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | string;
  is_blocked_on_client?: boolean | null;
  is_stuck?: boolean | null;
}

export function getClientVisibleStatus(task: TaskForClientView): ClientVisibleStatus {
  if (task.is_stuck) return 'on_hold';
  if (task.status === 'completed') return 'done';
  if (task.status === 'cancelled') return 'cancelled';
  if (task.is_blocked_on_client) return 'we_need_info';
  if (task.status === 'review') return 'under_review';
  if (task.status === 'in_progress') return 'in_progress';
  return 'scheduled';
}

export const CLIENT_VISIBLE_LABELS: Record<ClientVisibleStatus, string> = {
  scheduled: 'Scheduled',
  we_need_info: 'We Need Information from You',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  done: 'Done',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

/**
 * Tailwind-compatible Badge variants per client-visible status.
 * Keeps colors in lock-step with our zinc/teal/amber/red palette.
 */
export const CLIENT_VISIBLE_VARIANTS: Record<
  ClientVisibleStatus,
  'outline' | 'success' | 'warning' | 'teal' | 'destructive'
> = {
  scheduled: 'outline',
  we_need_info: 'warning',
  in_progress: 'teal',
  under_review: 'warning',
  done: 'success',
  on_hold: 'destructive',
  cancelled: 'outline',
};

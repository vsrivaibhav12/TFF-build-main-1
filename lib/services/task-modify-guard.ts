export function canModifyTask(task: { status: string; is_deleted?: boolean | null }): boolean {
  if (task.status === 'completed') return false;
  if (task.is_deleted) return false;
  return true;
}

export function canCompleteTask(task: { status: string; is_billable?: boolean | null; bill_reference?: string | null }): { ok: true } | { ok: false; reason: string } {
  if (task.status === 'completed') return { ok: false, reason: 'Task is already completed' };
  if (task.is_billable && !task.bill_reference) {
    return { ok: false, reason: 'Billable tasks require a bill reference before completion' };
  }
  return { ok: true };
}

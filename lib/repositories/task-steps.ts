import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface TaskStepRow {
  id: string;
  task_id: string;
  step_order: number;
  title: string;
  description: string | null;
  is_required: boolean;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  source_sop_step_id: string | null;
  users_profile?: { full_name: string | null; email: string | null } | null;
}

/**
 * List all task_steps for a given task in order, joined with the user who signed off.
 */
export async function listTaskSteps(taskId: string): Promise<TaskStepRow[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select(
      'id, task_id, step_order, title, description, is_required, completed_at, completed_by, completion_note, source_sop_step_id, users_profile:completed_by(full_name, email)',
    )
    .eq('task_id', taskId)
    .order('step_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TaskStepRow[];
}

/**
 * Returns required-step completion state for a task.
 * - total: total required steps
 * - completed: required steps with a completed_at value
 * - allRequiredDone: true when total === completed (also true when total === 0)
 */
export async function getTaskStepCompletion(
  taskId: string,
): Promise<{ total: number; completed: number; allRequiredDone: boolean }> {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select('id, is_required, completed_at')
    .eq('task_id', taskId);
  if (error) throw error;
  const required = (data ?? []).filter((r: any) => r.is_required);
  const completed = required.filter((r: any) => !!r.completed_at).length;
  return {
    total: required.length,
    completed,
    allRequiredDone: required.length === 0 || completed === required.length,
  };
}

import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listSopSteps(subServiceId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('sub_service_sop_steps')
    .select('id, sub_service_id, step_order, title, description, is_required')
    .eq('sub_service_id', subServiceId)
    .eq('is_deleted', false)
    .order('step_order', { ascending: true });
  return data ?? [];
}

export async function listTaskSteps(taskId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('task_steps')
    .select('id, task_id, step_order, title, description, is_required, completed_at, completed_by, completion_note, source_sop_step_id, users_profile(full_name)')
    .eq('task_id', taskId)
    .order('step_order', { ascending: true });
  return data ?? [];
}

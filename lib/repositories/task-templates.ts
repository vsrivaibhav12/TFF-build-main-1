import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listTaskTemplates(subServiceId?: string) {
  const sb = createClient();
  let q = sb
    .from('task_templates')
    .select('id, sub_service_id, title, description, frequency, due_day_of_month, estimated_days, default_assignee_id, default_reviewer_id, is_active, created_at')
    .eq('is_deleted', false)
    .eq('is_active', true)
    .order('title');
  if (subServiceId) q = q.eq('sub_service_id', subServiceId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getTaskTemplate(id: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_templates')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();
  if (error) throw error;
  return data;
}

export async function listTaskTemplateSteps(taskTemplateId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_template_steps')
    .select('id, task_template_id, step_order, title, description, is_required, guidance_notes')
    .eq('task_template_id', taskTemplateId)
    .eq('is_deleted', false)
    .order('step_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTaskTemplateWithSteps(id: string) {
  const template = await getTaskTemplate(id);
  const steps = await listTaskTemplateSteps(id);
  return { template, steps };
}

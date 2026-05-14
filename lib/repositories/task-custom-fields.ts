import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  service_id: string | null;
  sub_service_id: string | null;
  field_key: string;
  display_label: string;
  field_type: CustomFieldType;
  options_json: { options?: string[] } | null;
  is_required: boolean;
  display_order: number;
}

export interface CustomFieldValue {
  id: string;
  task_id: string;
  definition_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_bool: boolean | null;
}

export interface TaskLabel {
  code: string;
  display_name: string;
  color_hex: string | null;
  is_active: boolean;
}

/** List field definitions that apply to a given sub-service (and its parent service). */
export async function listDefinitionsForSubService(subServiceId: string): Promise<CustomFieldDefinition[]> {
  const sb = createClient();
  // Pull both sub-service-scoped and service-scoped definitions (the latter need a join).
  const { data: subDefs } = await sb
    .from('task_custom_field_definitions')
    .select('*')
    .eq('sub_service_id', subServiceId);
  const { data: sub } = await sb
    .from('sub_services')
    .select('service_id')
    .eq('id', subServiceId)
    .maybeSingle();
  const serviceId = (sub as any)?.service_id ?? null;
  let serviceDefs: any[] = [];
  if (serviceId) {
    const { data } = await sb
      .from('task_custom_field_definitions')
      .select('*')
      .eq('service_id', serviceId);
    serviceDefs = data ?? [];
  }
  return [...(serviceDefs ?? []), ...(subDefs ?? [])].sort((a, b) => a.display_order - b.display_order);
}

export async function listAllDefinitions(): Promise<CustomFieldDefinition[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_custom_field_definitions')
    .select('*')
    .order('display_order', { ascending: true });
  return (data ?? []) as CustomFieldDefinition[];
}

export async function listValuesForTask(taskId: string): Promise<CustomFieldValue[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_custom_field_values')
    .select('*')
    .eq('task_id', taskId);
  return (data ?? []) as CustomFieldValue[];
}

export async function listLabels(): Promise<TaskLabel[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_labels')
    .select('*')
    .eq('is_active', true)
    .order('display_name');
  return (data ?? []) as TaskLabel[];
}

export async function listLabelsForTask(taskId: string): Promise<string[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_label_assignments')
    .select('label_code')
    .eq('task_id', taskId);
  return (data ?? []).map((r: any) => r.label_code);
}

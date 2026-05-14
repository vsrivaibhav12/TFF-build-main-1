import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listServiceCategories() {
  const sb = createClient();
  const { data, error } = await sb
    .from('service_categories')
    .select('id, name, description, display_order')
    .eq('is_deleted', false)
    .order('display_order');
  if (error) throw error;
  return data ?? [];
}

export async function listServices() {
  const sb = createClient();
  const { data, error } = await sb
    .from('services')
    .select('id, code, name, description, category_id, service_categories(name)')
    .eq('is_deleted', false)
    .order('code');
  if (error) throw error;
  return data ?? [];
}

export async function listSubServices(serviceId?: string) {
  const sb = createClient();
  let q = sb
    .from('sub_services')
    .select('id, code, name, frequency, due_day_of_month, is_billable, is_recurring, requires_client_input, is_active, service_id, services(code, name)')
    .eq('is_deleted', false)
    .eq('is_active', true)
    .order('code');
  if (serviceId) q = q.eq('service_id', serviceId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listClientServices(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_services')
    .select('id, access_level, start_date, end_date, is_active, service_head_id, services(id, code, name, category_id), users_profile(full_name, email)')
    .eq('client_id', clientId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listClientSubServices(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_sub_services')
    .select('id, is_active, sub_services(id, code, name, frequency, service_id, services(code, name))')
    .eq('client_id', clientId);
  if (error) throw error;
  return data ?? [];
}

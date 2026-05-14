import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listAllNotices(filter?: { clientId?: string; status?: string }) {
  const sb = createClient();
  let q = sb
    .from('notices')
    .select('id, client_id, notice_type, notice_number, issuing_authority, notice_received_date, due_date, status, subject, amount_involved, assigned_to, clients!notices_client_id_fkey(business_name), users_profile!notices_assigned_to_fkey(full_name)')
    .eq('is_deleted', false)
    .order('notice_received_date', { ascending: false, nullsFirst: false });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listHearings(filter?: { clientId?: string; status?: string }) {
  const sb = createClient();
  let q = sb
    .from('hearings')
    .select('id, client_id, hearing_type, hearing_scheduled_date, hearing_held_date, next_hearing_date, status, venue, officer_name, subject, order_amount, order_date, clients!hearings_client_id_fkey(business_name)')
    .order('hearing_scheduled_date', { ascending: true, nullsFirst: false });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}

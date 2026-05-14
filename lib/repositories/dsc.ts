import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listDscRecords(filter?: { clientId?: string; status?: string }) {
  const sb = createClient();
  let q = sb
    .from('dsc_records')
    .select('id, client_id, holder_name, holder_contact_email, dsc_class, dsc_type, certificate_serial, certificate_issuer, issued_date, expiry_date, registered_portals, status, custodian_name, physical_location, clients(business_name)')
    .eq('is_deleted', false)
    .order('expiry_date', { ascending: true });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getDscById(id: string) {
  const sb = createClient();
  const { data } = await sb.from('dsc_records').select('*, clients(business_name)').eq('id', id).maybeSingle();
  return data;
}

export async function listExpiringDsc(days = 30) {
  const sb = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb
    .from('dsc_records')
    .select('id, client_id, holder_name, holder_contact_email, expiry_date, status, expiry_alert_sent, clients(business_name, primary_contact_email)')
    .eq('is_deleted', false)
    .eq('status', 'active')
    .gte('expiry_date', today)
    .lte('expiry_date', horizon);
  return data ?? [];
}

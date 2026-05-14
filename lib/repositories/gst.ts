import { createClient } from '@/lib/supabase/server';

export async function getGstMonthlyDataForClient(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('gst_monthly_data')
    .select('*')
    .eq('client_id', clientId)
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getGstMonthlyDataForAllClients() {
  const sb = createClient();
  const { data, error } = await sb
    .from('gst_monthly_data')
    .select('*, clients!gst_monthly_data_client_id_fkey(business_name)')
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}

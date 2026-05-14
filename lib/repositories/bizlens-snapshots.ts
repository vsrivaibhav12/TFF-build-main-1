import { createClient } from '@/lib/supabase/server';

export interface BizlensSnapshot {
  id?: string;
  client_id: string;
  period_month: number;
  period_year: number;
  months_covered: number;
  data: Record<string, any>;
  created_by?: string;
}

export async function listBizlensSnapshots(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('bizlens_period_snapshots')
    .select('*')
    .eq('client_id', clientId)
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BizlensSnapshot[];
}

export async function upsertBizlensSnapshot(snapshot: BizlensSnapshot) {
  const sb = createClient();
  const payload = {
    client_id: snapshot.client_id,
    period_month: snapshot.period_month,
    period_year: snapshot.period_year,
    months_covered: snapshot.months_covered,
    data: snapshot.data,
    created_by: snapshot.created_by,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from('bizlens_period_snapshots')
    .upsert(payload, { onConflict: 'client_id,period_year,period_month' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBizlensSnapshot(id: string) {
  const sb = createClient();
  const { error } = await sb.from('bizlens_period_snapshots').delete().eq('id', id);
  if (error) throw error;
}

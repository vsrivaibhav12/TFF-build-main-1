import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { BizlensData } from '@/lib/services/bizlens-service';

export async function listReportsByClient(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('bizlens_data')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  if (error) throw error;
  return data as BizlensData[];
}

export async function getReportById(reportId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('bizlens_data')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw error;
  return data as BizlensData;
}

export async function createReportRecord(payload: any) {
  const sb = createClient();
  const { data, error } = await sb
    .from('bizlens_data')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as BizlensData;
}

export async function updateReportRecord(reportId: string, updates: any) {
  const sb = createClient();
  const { error } = await sb
    .from('bizlens_data')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', reportId);

  if (error) throw error;
}

export async function logAuditAction(payload: any) {
  const sb = createClient();
  const { error } = await sb.from('global_audit_log').insert(payload);
  if (error) throw error;
}

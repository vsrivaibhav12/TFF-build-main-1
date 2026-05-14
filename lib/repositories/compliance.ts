import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listGstFilings(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('gst_filings')
    .select('id, return_type, period_year, period_month, status, filed_date, ack_number, taxable_turnover, output_tax_total, itc_claimed, net_tax_payable, late_fee, interest_amount, is_current, change_reason, updated_at')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTdsFilings(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('tds_filings')
    .select('id, period_quarter, period_year, status, filed_date, ack_number, total_deductions, tax_deposited, deductee_count, is_current, change_reason')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .order('period_year', { ascending: false })
    .order('period_quarter', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listItFilings(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('it_filings')
    .select('id, fy_ending_year, status, filed_date, ack_number, gross_income, deductions_claimed, taxable_income, tax_liability, refund_amount, is_current, change_reason')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .order('fy_ending_year', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listNotices(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('notices')
    .select('id, notice_type, notice_number, notice_received_date, due_date, status, subject, description, amount_involved, assigned_to, users_profile!notices_assigned_to_fkey(full_name)')
    .eq('client_id', clientId)
    .eq('is_deleted', false)
    .order('notice_received_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Aggregate of upcoming due dates from the compliance calendar.
 * RLS automatically scopes to the caller's accessible clients.
 */
export async function listAllUpcomingDueDates(days = 45) {
  const sb = createClient();
  const todayISO = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await sb
    .from('compliance_calendar_events')
    .select('id, client_id, rule_code, period_label, due_date, status, clients!compliance_calendar_events_client_id_fkey(business_name), compliance_calendar_rules!compliance_calendar_events_rule_id_fkey(service_kind)')
    .gte('due_date', todayISO)
    .lte('due_date', horizon)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Failed to list upcoming due dates:', error);
    return { gst: [], tds: [], it: [] };
  }

  // Group by service_kind to maintain compatibility with existing consumers
  const out: { gst: any[]; tds: any[]; it: any[] } = { gst: [], tds: [], it: [] };
  
  for (const e of data ?? []) {
    const kind = (e as any).compliance_calendar_rules?.service_kind;
    const item = {
      ...e,
      return_type: (e as any).rule_code, // Map rule_code to return_type for compat
    };
    
    if (kind === 'gst') out.gst.push(item);
    else if (kind === 'tds') out.tds.push(item);
    else if (kind === 'it') out.it.push(item);
  }

  return out;
}

export async function listComplianceStatus(clientId?: string) {
  const sb = createClient();
  let q = sb
    .from('compliance_status')
    .select('id, client_id, filing_type, period_identifier, status, due_date, filed_date, ack_number, days_to_deadline, is_overdue, updated_at, clients!compliance_status_client_id_fkey(business_name)');
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q.order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

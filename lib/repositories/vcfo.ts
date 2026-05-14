import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listVcfoSnapshots(clientId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('vcfo_snapshots')
    .select('id, month, year, cash_in_bank, monthly_burn, revenue, key_expenses, budgeted_revenue, budgeted_expenses, actual_revenue, actual_expenses, advisor_notes, updated_at')
    .eq('client_id', clientId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  return data ?? [];
}

export async function listSolutionLog(clientId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('solution_log')
    .select('id, issue_identified_date, issue_description, issue_category, root_cause, financial_impact_estimate, recommended_solution, solution_status, actual_outcome, implementation_date')
    .eq('client_id', clientId)
    .order('issue_identified_date', { ascending: false });
  return data ?? [];
}

export async function addSolutionLogEntry(payload: {
  client_id: string;
  issue_identified_date: string;
  issue_description: string;
  issue_category: string;
  recommended_solution: string;
  solution_status: string;
  identified_by: string;
}) {
  const sb = createClient();
  const { data, error } = await sb.from('solution_log').insert(payload).select().single();
  if (error) throw error;
  return data;
}

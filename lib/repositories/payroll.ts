import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listPayrollRuns(filter?: { userId?: string; year?: number; month?: number }) {
  const sb = createClient();
  let q = sb
    .from('payroll_runs')
    .select('id, user_id, month, year, total_working_days, actual_present_days, actual_leave_days, gross_salary, total_deductions, final_salary, status, created_at, users_profile!payroll_runs_user_id_fkey(full_name, email)')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (filter?.userId) q = q.eq('user_id', filter.userId);
  if (filter?.year) q = q.eq('year', filter.year);
  if (filter?.month) q = q.eq('month', filter.month);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getPayrollRun(id: string) {
  const sb = createClient();
  const { data } = await sb
    .from('payroll_runs')
    .select('*, users_profile!payroll_runs_user_id_fkey(full_name, email)')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function getPayrollSettings(userId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('staff_payroll_settings')
    .select('monthly_salary, paid_leaves_per_month, deduction_applicable, salary_adjustment_for_leaves, leave_carry_forward_allowed, max_carry_forward_days, effective_from, effective_to')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

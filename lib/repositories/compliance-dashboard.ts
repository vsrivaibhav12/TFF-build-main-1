import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface DashboardCell {
  rule_code: string;
  rule_name: string;
  service_kind: string;
  period_label: string;
  period_due_date: string;
  total_clients: number;          // # clients to whom this rule applies in this period
  task_created: number;            // count of clients with task created
  upcoming: number;                // count remaining as virtual events (no task)
  overdue: number;                 // count of events past due with no task
  filed: number;                   // count of events with task in completed status
  stuck: number;                   // count of events whose task is stuck
}

/**
 * Compliance Dashboard "Comp" view. One row per (rule × period_label) within
 * the horizon window. Cells aggregate client counts by status.
 */
export async function loadComplianceDashboard(opts: {
  horizonMonths?: number;
} = {}): Promise<DashboardCell[]> {
  const sb = createClient();
  const horizonMonths = opts.horizonMonths ?? 6;
  const fromIso = new Date().toISOString().slice(0, 10);
  const toIso = new Date(Date.now() + horizonMonths * 31 * 86400000).toISOString().slice(0, 10);

  const { data: events } = await sb
    .from('compliance_calendar_events')
    .select('id, rule_id, rule_code, period_label, due_date, status, task_id, compliance_calendar_rules(display_name, service_kind), tasks(status, is_stuck)')
    .gte('due_date', fromIso)
    .lte('due_date', toIso);

  const todayIso = fromIso;
  const grouped: Record<string, DashboardCell> = {};
  for (const e of events ?? []) {
    const key = `${(e as any).rule_code}::${(e as any).period_label}`;
    if (!grouped[key]) {
      grouped[key] = {
        rule_code: (e as any).rule_code,
        rule_name: (e as any).compliance_calendar_rules?.display_name ?? (e as any).rule_code,
        service_kind: (e as any).compliance_calendar_rules?.service_kind ?? 'other',
        period_label: (e as any).period_label,
        period_due_date: (e as any).due_date,
        total_clients: 0,
        task_created: 0,
        upcoming: 0,
        overdue: 0,
        filed: 0,
        stuck: 0,
      };
    }
    const cell = grouped[key];
    cell.total_clients += 1;

    const taskStatus = (e as any).tasks?.status as string | null | undefined;
    const taskStuck = !!(e as any).tasks?.is_stuck;
    const dueDate = (e as any).due_date as string;
    const isPastDue = dueDate < todayIso;

    if (taskStatus === 'completed') cell.filed += 1;
    else if (taskStuck) cell.stuck += 1;
    else if ((e as any).task_id) cell.task_created += 1;
    else if (isPastDue) cell.overdue += 1;
    else cell.upcoming += 1;

    // Earliest due_date wins for the period_due_date display.
    if (dueDate < cell.period_due_date) cell.period_due_date = dueDate;
  }
  return Object.values(grouped).sort((a, b) => {
    if (a.service_kind !== b.service_kind) return a.service_kind.localeCompare(b.service_kind);
    if (a.rule_code !== b.rule_code) return a.rule_code.localeCompare(b.rule_code);
    return a.period_due_date.localeCompare(b.period_due_date);
  });
}

/**
 * Non-Comp view: clients without a task for a given (rule, period).
 * Used to drive the "create tasks for selected" flow.
 */
export async function loadNonCompClients(rule_code: string, period_label: string) {
  const sb = createClient();
  const { data } = await sb
    .from('compliance_calendar_events')
    .select('client_id, rule_code, period_label, due_date, clients(business_name, gstin)')
    .eq('rule_code', rule_code)
    .eq('period_label', period_label)
    .is('task_id', null);
  return data ?? [];
}

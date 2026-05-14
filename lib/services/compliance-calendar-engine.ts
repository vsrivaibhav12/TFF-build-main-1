import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Compliance Calendar Rules Engine (v3 #3).
 *
 * For each (rule, client_compliance_profile) pair, generate virtual events for
 * a date window [from, to]. Events are persisted to compliance_calendar_events
 * so they can be queried fast by the team and portal calendars.
 *
 * Periodicities supported: monthly, quarterly, half_yearly, yearly.
 * Predicates supported in rule.applies_when JSONB:
 *   - gst_filing_frequency: 'monthly' | 'qrmp'
 *   - state_group: 'A' | 'B'
 *   - is_audit_applicable: boolean
 *   - is_tds_deductor: boolean
 *   - is_tcs_collector: boolean
 *   - is_advance_tax_applicable: boolean
 *   - is_pf_applicable / is_esi_applicable / is_pt_applicable: boolean
 *   - is_roc_applicable: boolean
 *   - is_transfer_pricing: boolean
 *   - pt_state: string equality
 *   - month: number (rule applies only to that calendar month)
 *   - exclude_month: number (rule excludes that calendar month)
 *   - quarter: number (1-4) — rule applies only to that fiscal quarter end
 *   - annual_turnover_above: number — applies when client.annual_turnover_estimate >= this
 */

export interface CalendarRule {
  id: string;
  rule_code: string;
  display_name: string;
  service_kind: string;
  periodicity: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_off';
  due_day: number | null;
  due_month_offset: number;
  due_date_formula: string | null;
  applies_when: Record<string, any>;
  reminder_days: number[];
  is_active: boolean;
}

export interface ClientProfile {
  client_id: string;
  gst_filing_frequency?: string | null;
  state_group?: string | null;
  entity_type?: string | null;
  is_audit_applicable: boolean;
  is_tds_deductor: boolean;
  is_tcs_collector: boolean;
  is_advance_tax_applicable: boolean;
  is_pf_applicable: boolean;
  is_esi_applicable: boolean;
  is_pt_applicable: boolean;
  pt_state?: string | null;
  is_roc_applicable: boolean;
  agm_date?: string | null;
  is_transfer_pricing: boolean;
  annual_turnover_estimate?: number | null;
  fy_start_month: number;
}

export interface GeneratedEvent {
  client_id: string;
  rule_id: string;
  rule_code: string;
  period_label: string;
  due_date: string; // ISO yyyy-mm-dd
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateISO(y: number, m1: number, d: number): string {
  return `${y}-${pad(m1)}-${pad(d)}`;
}

function lastDayOfMonth(y: number, m1: number): number {
  return new Date(y, m1, 0).getDate();
}

function monthName(m1: number): string {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m1 - 1];
}

function fyForDate(y: number, m1: number, fyStart: number): { fyLabel: string; fyStartYear: number } {
  // FY runs fyStart-month of year X to (fyStart-1)-month of year X+1.
  const fyStartYear = m1 >= fyStart ? y : y - 1;
  return { fyLabel: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(2)}`, fyStartYear };
}

function quarterOfFy(m1: number, fyStart: number): number {
  // Q1=fyStart..fyStart+2, Q2=fyStart+3..fyStart+5, Q3=fyStart+6..fyStart+8, Q4=fyStart+9..fyStart+11
  const offset = (m1 - fyStart + 12) % 12;
  return Math.floor(offset / 3) + 1;
}

function passesPredicates(rule: CalendarRule, profile: ClientProfile, periodMeta?: { month?: number; quarter?: number }): boolean {
  const w = rule.applies_when || {};

  if (w.gst_filing_frequency && profile.gst_filing_frequency !== w.gst_filing_frequency) return false;
  if (w.state_group && profile.state_group !== w.state_group) return false;
  if (w.entity_type && profile.entity_type !== w.entity_type) return false;
  if (typeof w.is_audit_applicable === 'boolean' && !!profile.is_audit_applicable !== w.is_audit_applicable) return false;
  if (typeof w.is_tds_deductor === 'boolean' && !!profile.is_tds_deductor !== w.is_tds_deductor) return false;
  if (typeof w.is_tcs_collector === 'boolean' && !!profile.is_tcs_collector !== w.is_tcs_collector) return false;
  if (typeof w.is_advance_tax_applicable === 'boolean' && !!profile.is_advance_tax_applicable !== w.is_advance_tax_applicable) return false;
  if (typeof w.is_pf_applicable === 'boolean' && !!profile.is_pf_applicable !== w.is_pf_applicable) return false;
  if (typeof w.is_esi_applicable === 'boolean' && !!profile.is_esi_applicable !== w.is_esi_applicable) return false;
  if (typeof w.is_pt_applicable === 'boolean' && !!profile.is_pt_applicable !== w.is_pt_applicable) return false;
  if (w.pt_state && profile.pt_state !== w.pt_state) return false;
  if (typeof w.is_roc_applicable === 'boolean' && !!profile.is_roc_applicable !== w.is_roc_applicable) return false;
  if (typeof w.is_transfer_pricing === 'boolean' && !!profile.is_transfer_pricing !== w.is_transfer_pricing) return false;
  if (typeof w.annual_turnover_above === 'number' && (profile.annual_turnover_estimate ?? 0) < w.annual_turnover_above) return false;

  if (periodMeta?.month !== undefined && typeof w.month === 'number' && periodMeta.month !== w.month) return false;
  if (periodMeta?.month !== undefined && typeof w.exclude_month === 'number' && periodMeta.month === w.exclude_month) return false;
  if (periodMeta?.quarter !== undefined && typeof w.quarter === 'number' && periodMeta.quarter !== w.quarter) return false;

  return true;
}

/**
 * Generate events for one rule applied to one client over the date window.
 */
export function generateEventsForRule(
  rule: CalendarRule,
  profile: ClientProfile,
  fromIso: string,
  toIso: string,
): GeneratedEvent[] {
  if (!rule.is_active) return [];
  const events: GeneratedEvent[] = [];
  const fromY = parseInt(fromIso.slice(0, 4), 10);
  const fromM = parseInt(fromIso.slice(5, 7), 10);
  const toY = parseInt(toIso.slice(0, 4), 10);
  const toM = parseInt(toIso.slice(5, 7), 10);

  function add(period_label: string, dueIso: string, periodMeta?: { month?: number; quarter?: number }) {
    if (!passesPredicates(rule, profile, periodMeta)) return;
    if (dueIso < fromIso || dueIso > toIso) return;
    events.push({
      client_id: profile.client_id,
      rule_id: rule.id,
      rule_code: rule.rule_code,
      period_label,
      due_date: dueIso,
    });
  }

  // ROC items with formulas based on AGM date are one-off per FY
  if (rule.due_date_formula?.startsWith('agm_date')) {
    if (!profile.agm_date) return [];
    const agm = new Date(profile.agm_date);
    let offsetDays = 30;
    if (rule.due_date_formula.includes('+30d')) offsetDays = 30;
    else if (rule.due_date_formula.includes('+60d')) offsetDays = 60;
    const due = new Date(agm.getTime() + offsetDays * 86400_000);
    const dueIso = due.toISOString().slice(0, 10);
    const { fyLabel } = fyForDate(agm.getFullYear(), agm.getMonth() + 1, profile.fy_start_month);
    add(fyLabel, dueIso);
    return events;
  }

  // Monthly: emit one event per month inside the window.
  if (rule.periodicity === 'monthly') {
    let y = fromY, m = fromM;
    while (y < toY || (y === toY && m <= toM)) {
      // Period is the month being captured (period_label "May 2026"); due date is shifted forward by due_month_offset.
      const targetY = m + rule.due_month_offset > 12 ? y + Math.floor((m + rule.due_month_offset - 1) / 12) : y;
      const targetM = ((m + rule.due_month_offset - 1) % 12) + 1;
      const dueDay = Math.min(rule.due_day ?? 1, lastDayOfMonth(targetY, targetM));
      add(`${monthName(m)} ${y}`, dateISO(targetY, targetM, dueDay), { month: m });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return events;
  }

  // Quarterly: emit one event per fiscal quarter END inside window.
  if (rule.periodicity === 'quarterly') {
    // Walk year by year; for each FY compute 4 quarter-end months relative to fy_start_month.
    const fyStart = profile.fy_start_month;
    const yearsToCheck = new Set<number>();
    yearsToCheck.add(fromY); yearsToCheck.add(toY); yearsToCheck.add(fromY - 1); yearsToCheck.add(toY + 1);
    for (const fyStartYear of yearsToCheck) {
      for (let q = 1; q <= 4; q++) {
        // Last month of quarter q in this FY
        const qLastOffset = q * 3 - 1; // 2,5,8,11
        const qLastMAbs = fyStart + qLastOffset; // 1-based, may exceed 12
        const qLastY = fyStartYear + Math.floor((qLastMAbs - 1) / 12);
        const qLastM = ((qLastMAbs - 1) % 12) + 1;
        // Due date: qLast + due_month_offset months, on due_day (or last day if missing).
        const dueMAbs = qLastM + rule.due_month_offset;
        const dueY = qLastY + Math.floor((dueMAbs - 1) / 12);
        const dueM = ((dueMAbs - 1) % 12) + 1;
        const dueDay = Math.min(rule.due_day ?? lastDayOfMonth(dueY, dueM), lastDayOfMonth(dueY, dueM));
        const fyLabel = `Q${q} ${fyStartYear}-${(fyStartYear + 1).toString().slice(2)}`;
        add(fyLabel, dateISO(dueY, dueM, dueDay), { quarter: q, month: qLastM });
      }
    }
    return events;
  }

  // Half-yearly: emit two events per FY (Apr-Sep half and Oct-Mar half).
  if (rule.periodicity === 'half_yearly') {
    const fyStart = profile.fy_start_month;
    for (const fyStartYear of [fromY - 1, fromY, toY]) {
      for (const halfStartOffset of [0, 6]) {
        const halfM = ((fyStart + halfStartOffset - 1) % 12) + 1;
        const halfY = fyStartYear + Math.floor((fyStart + halfStartOffset - 1) / 12);
        const dueMAbs = halfM + rule.due_month_offset;
        const dueY = halfY + Math.floor((dueMAbs - 1) / 12);
        const dueM = ((dueMAbs - 1) % 12) + 1;
        const dueDay = Math.min(rule.due_day ?? 1, lastDayOfMonth(dueY, dueM));
        const fyLabel = `${monthName(halfM)} ${halfY}`;
        add(fyLabel, dateISO(dueY, dueM, dueDay), { month: halfM });
      }
    }
    return events;
  }

  // Yearly: emit once per FY in window.
  if (rule.periodicity === 'yearly') {
    const fyStart = profile.fy_start_month;
    for (const fyStartYear of [fromY - 1, fromY, toY, toY + 1]) {
      const dueMAbs = fyStart + rule.due_month_offset;
      const dueY = fyStartYear + Math.floor((dueMAbs - 1) / 12);
      const dueM = ((dueMAbs - 1) % 12) + 1;
      const dueDay = Math.min(rule.due_day ?? lastDayOfMonth(dueY, dueM), lastDayOfMonth(dueY, dueM));
      const fyLabel = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(2)}`;
      add(fyLabel, dateISO(dueY, dueM, dueDay));
    }
    return events;
  }

  return events;
}

/**
 * Refresh `compliance_calendar_events` for all clients and rules
 * within the given window. Idempotent (UNIQUE on client_id+rule_id+period_label).
 *
 * Used by:
 *   - the nightly cron at /api/cron/refresh-compliance-events
 *   - manually after a profile/rules change.
 */
export async function refreshComplianceEvents(opts: {
  fromIso?: string;
  toIso?: string;
  clientId?: string;
} = {}): Promise<{ generated: number; rules: number; clients: number }> {
  const sb = createClient();
  // Default window: today minus 1 month → today + 12 months.
  const today = new Date();
  const fromIso = opts.fromIso ?? new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
  const toIso = opts.toIso ?? new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: rules }, profilesQ] = await Promise.all([
    sb.from('compliance_calendar_rules').select('*').eq('is_active', true),
    opts.clientId
      ? sb.from('client_compliance_profiles').select('*').eq('client_id', opts.clientId)
      : sb.from('client_compliance_profiles').select('*'),
  ]);
  const profiles = profilesQ.data ?? [];
  if (!rules || rules.length === 0 || profiles.length === 0) {
    return { generated: 0, rules: rules?.length ?? 0, clients: profiles.length };
  }

  let generated = 0;
  const allEvents: GeneratedEvent[] = [];
  for (const rule of rules as CalendarRule[]) {
    for (const profile of profiles as ClientProfile[]) {
      const events = generateEventsForRule(rule, profile, fromIso, toIso);
      allEvents.push(...events);
    }
  }

  // Bulk upsert in chunks of 500.
  for (let i = 0; i < allEvents.length; i += 500) {
    const chunk = allEvents.slice(i, i + 500).map((e) => ({
      ...e,
      status: 'upcoming' as const,
    }));
    const { error } = await sb
      .from('compliance_calendar_events')
      .upsert(chunk, { onConflict: 'client_id,rule_id,period_label', ignoreDuplicates: true });
    if (!error) generated += chunk.length;
  }

  return { generated, rules: rules.length, clients: profiles.length };
}

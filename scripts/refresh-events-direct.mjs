#!/usr/bin/env node
// Run the compliance calendar engine via Supabase Management API.
import fs from 'node:fs';

const ROOT = '/sessions/nifty-bold-tesla/mnt/TFF-build-main';
const env = {};
for (const rawLine of fs.readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const line = rawLine.replace(/\r$/, '');
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}
const MGMT = `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`;

async function runSql(sql, label) {
  const res = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[${label}] HTTP ${res.status}:`, text.slice(0, 2000));
    throw new Error(`SQL failed: ${label}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') return "'" + v.replace(/'/g, "''") + "'";
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function dateISO(y, m1, d) { return `${y}-${pad(m1)}-${pad(d)}`; }
function lastDayOfMonth(y, m1) { return new Date(y, m1, 0).getDate(); }
function monthName(m1) { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m1-1]; }

function passesPredicates(rule, profile, periodMeta) {
  const w = rule.applies_when || {};
  if (w.gst_filing_frequency && profile.gst_filing_frequency !== w.gst_filing_frequency) return false;
  if (w.state_group && profile.state_group !== w.state_group) return false;
  if (w.entity_type && profile.entity_type !== w.entity_type) return false;
  for (const flag of ['is_audit_applicable','is_tds_deductor','is_tcs_collector','is_advance_tax_applicable',
                       'is_pf_applicable','is_esi_applicable','is_pt_applicable','is_roc_applicable','is_transfer_pricing']) {
    if (typeof w[flag] === 'boolean' && !!profile[flag] !== w[flag]) return false;
  }
  if (w.pt_state && profile.pt_state !== w.pt_state) return false;
  if (typeof w.annual_turnover_above === 'number' && (profile.annual_turnover_estimate ?? 0) < w.annual_turnover_above) return false;
  if (periodMeta?.month !== undefined && typeof w.month === 'number' && periodMeta.month !== w.month) return false;
  if (periodMeta?.month !== undefined && typeof w.exclude_month === 'number' && periodMeta.month === w.exclude_month) return false;
  if (periodMeta?.quarter !== undefined && typeof w.quarter === 'number' && periodMeta.quarter !== w.quarter) return false;
  return true;
}

function generateEventsForRule(rule, profile, fromIso, toIso) {
  if (!rule.is_active) return [];
  const events = [];
  const fromY = parseInt(fromIso.slice(0, 4), 10);
  const fromM = parseInt(fromIso.slice(5, 7), 10);
  const toY = parseInt(toIso.slice(0, 4), 10);
  const toM = parseInt(toIso.slice(5, 7), 10);
  function add(period_label, dueIso, periodMeta) {
    if (!passesPredicates(rule, profile, periodMeta)) return;
    if (dueIso < fromIso || dueIso > toIso) return;
    events.push({ client_id: profile.client_id, rule_id: rule.id, rule_code: rule.rule_code, period_label, due_date: dueIso });
  }
  if (rule.due_date_formula?.startsWith('agm_date')) {
    if (!profile.agm_date) return [];
    const agm = new Date(profile.agm_date);
    let offsetDays = 30;
    if (rule.due_date_formula.includes('+30d')) offsetDays = 30;
    else if (rule.due_date_formula.includes('+60d')) offsetDays = 60;
    const due = new Date(agm.getTime() + offsetDays * 86400_000);
    const dueIso = due.toISOString().slice(0, 10);
    const y = agm.getFullYear(), m = agm.getMonth() + 1;
    const fyStartYear = m >= profile.fy_start_month ? y : y - 1;
    const fyLabel = `FY ${fyStartYear}-${(fyStartYear+1).toString().slice(2)}`;
    add(fyLabel, dueIso);
    return events;
  }
  if (rule.periodicity === 'monthly') {
    let y = fromY, m = fromM;
    while (y < toY || (y === toY && m <= toM)) {
      const targetY = m + rule.due_month_offset > 12 ? y + Math.floor((m + rule.due_month_offset - 1) / 12) : y;
      const targetM = ((m + rule.due_month_offset - 1) % 12) + 1;
      const dueDay = Math.min(rule.due_day ?? 1, lastDayOfMonth(targetY, targetM));
      add(`${monthName(m)} ${y}`, dateISO(targetY, targetM, dueDay), { month: m });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return events;
  }
  if (rule.periodicity === 'quarterly') {
    const fyStart = profile.fy_start_month;
    const yearsToCheck = new Set([fromY, toY, fromY-1, toY+1]);
    for (const fyStartYear of yearsToCheck) {
      for (let q = 1; q <= 4; q++) {
        const qLastOffset = q*3 - 1;
        const qLastMAbs = fyStart + qLastOffset;
        const qLastY = fyStartYear + Math.floor((qLastMAbs-1)/12);
        const qLastM = ((qLastMAbs-1) % 12) + 1;
        const dueMAbs = qLastM + rule.due_month_offset;
        const dueY = qLastY + Math.floor((dueMAbs-1)/12);
        const dueM = ((dueMAbs-1) % 12) + 1;
        const dueDay = Math.min(rule.due_day ?? lastDayOfMonth(dueY, dueM), lastDayOfMonth(dueY, dueM));
        const fyLabel = `Q${q} ${fyStartYear}-${(fyStartYear+1).toString().slice(2)}`;
        add(fyLabel, dateISO(dueY, dueM, dueDay), { quarter: q, month: qLastM });
      }
    }
    return events;
  }
  if (rule.periodicity === 'half_yearly') {
    const fyStart = profile.fy_start_month;
    for (const fyStartYear of [fromY-1, fromY, toY]) {
      for (const halfStartOffset of [0, 6]) {
        const halfM = ((fyStart + halfStartOffset - 1) % 12) + 1;
        const halfY = fyStartYear + Math.floor((fyStart + halfStartOffset - 1)/12);
        const dueMAbs = halfM + rule.due_month_offset;
        const dueY = halfY + Math.floor((dueMAbs-1)/12);
        const dueM = ((dueMAbs-1) % 12) + 1;
        const dueDay = Math.min(rule.due_day ?? 1, lastDayOfMonth(dueY, dueM));
        const fyLabel = `${monthName(halfM)} ${halfY}`;
        add(fyLabel, dateISO(dueY, dueM, dueDay), { month: halfM });
      }
    }
    return events;
  }
  if (rule.periodicity === 'yearly') {
    const fyStart = profile.fy_start_month;
    for (const fyStartYear of [fromY-1, fromY, toY, toY+1]) {
      const dueMAbs = fyStart + rule.due_month_offset;
      const dueY = fyStartYear + Math.floor((dueMAbs-1)/12);
      const dueM = ((dueMAbs-1) % 12) + 1;
      const dueDay = Math.min(rule.due_day ?? lastDayOfMonth(dueY, dueM), lastDayOfMonth(dueY, dueM));
      const fyLabel = `FY ${fyStartYear}-${(fyStartYear+1).toString().slice(2)}`;
      add(fyLabel, dateISO(dueY, dueM, dueDay));
    }
    return events;
  }
  return events;
}

async function main() {
  const today = new Date();
  const fromIso = new Date(today.getFullYear(), today.getMonth()-1, 1).toISOString().slice(0,10);
  const toIso = new Date(today.getFullYear()+1, today.getMonth(), 1).toISOString().slice(0,10);
  console.log('Window:', fromIso, '→', toIso);

  const rules = await runSql(`SELECT id, rule_code, display_name, service_kind, periodicity, due_day, due_month_offset, due_date_formula, applies_when, reminder_days, is_active FROM compliance_calendar_rules WHERE is_active=true;`, 'fetch-rules');
  const profiles = await runSql(`SELECT * FROM client_compliance_profiles;`, 'fetch-profiles');
  console.log('Rules:', rules.length, '· Profiles:', profiles.length);

  const allEvents = [];
  for (const rule of rules) {
    // applies_when may be returned as JSON or string — normalize
    if (typeof rule.applies_when === 'string') {
      try { rule.applies_when = JSON.parse(rule.applies_when); } catch { rule.applies_when = {}; }
    }
    rule.applies_when = rule.applies_when || {};
    for (const profile of profiles) {
      const events = generateEventsForRule(rule, profile, fromIso, toIso);
      allEvents.push(...events);
    }
  }
  console.log('Generated events:', allEvents.length);
  if (allEvents.length === 0) { console.log('Nothing to insert.'); return; }

  // Bulk INSERT ... ON CONFLICT DO NOTHING. Split into chunks of 200 to keep SQL size reasonable.
  let inserted = 0;
  for (let i = 0; i < allEvents.length; i += 200) {
    const chunk = allEvents.slice(i, i+200);
    const values = chunk.map(e => `(${esc(e.client_id)}, ${esc(e.rule_id)}, ${esc(e.rule_code)}, ${esc(e.period_label)}, DATE ${esc(e.due_date)}, 'upcoming')`).join(',\n');
    const sql = `INSERT INTO compliance_calendar_events (client_id, rule_id, rule_code, period_label, due_date, status) VALUES ${values} ON CONFLICT (client_id, rule_id, period_label) DO NOTHING;`;
    await runSql(sql, `insert-${i}`);
    inserted += chunk.length;
    process.stdout.write(`  inserted ${inserted}/${allEvents.length}\r`);
  }
  console.log(`\nDone. Inserted ${inserted} events (duplicates auto-skipped).`);

  const summary = await runSql(`SELECT rule_code, COUNT(*)::int AS n FROM compliance_calendar_events GROUP BY rule_code ORDER BY rule_code;`, 'summary');
  console.table(summary);
}

main().catch(e => { console.error('FATAL', e?.message ?? e); process.exit(1); });

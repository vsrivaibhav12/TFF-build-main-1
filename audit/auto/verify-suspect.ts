/**
 * Targeted verification of specific high-signal drift items.
 * Pulls the actual columns of suspect tables and prints them.
 */
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/app/.env.local' });

const live = JSON.parse(fs.readFileSync('/app/audit/auto/live-schema.json', 'utf8'));

const cols: Record<string, string[]> = {};
for (const c of live.columns) {
  if (c.table_schema !== 'public') continue;
  if (!cols[c.table_name]) cols[c.table_name] = [];
  cols[c.table_name].push(c.column_name);
}

const tablesOfInterest = [
  'services', 'sub_services', 'task_templates', 'task_template_steps',
  'queries', 'query_messages',
  'dsc_records', 'clients',
  'task_steps', 'task_workdone', 'work_done',
  'compliance_calendar_rules', 'compliance_calendar_events',
  'staff_role_templates', 'staff_role_template_capabilities',
  'staff_capabilities', 'staff_payroll_settings',
  'client_groups', 'task_activity',
  'notices', 'hearings', 'notifications', 'notification_preferences',
  'documents', 'document_requests', 'task_document_requests',
  'payroll_runs', 'payroll_adjustments', 'leave_requests', 'attendance_logs',
  'vcfo_snapshots', 'solution_log', 'bizlens_data',
];

for (const t of tablesOfInterest) {
  if (!cols[t]) { console.log(`❌ ${t}: NOT IN LIVE`); continue; }
  console.log(`✓ ${t} (${cols[t].length}): ${cols[t].join(', ')}`);
}

// also check the policies on the at-risk tables (RLS-off tables)
const rlsOff = live.rls_status.filter((r: any) => !r.rowsecurity).map((r: any) => r.tablename);
console.log('\n=== RLS-DISABLED public tables ===');
for (const t of rlsOff) console.log(`  ${t}`);

console.log('\n=== Tables with RLS ON but 0 policies (locked-out) ===');
const polByTable: Record<string, number> = {};
for (const p of live.policies) polByTable[p.tablename] = (polByTable[p.tablename] || 0) + 1;
for (const r of live.rls_status) {
  if (r.rowsecurity && !polByTable[r.tablename]) console.log(`  ${r.tablename}`);
}

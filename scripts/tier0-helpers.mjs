#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/sessions/nifty-bold-tesla/mnt/TFF-build-main';

const env = {};
for (const rawLine of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const line = rawLine.replace(/\r$/, '');
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}
for (const k of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF']) {
  if (!env[k]) { console.error('Missing', k); process.exit(1); }
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

async function step(name, fn) {
  process.stdout.write(`\n=== ${name} ===\n`);
  const t = Date.now();
  try {
    const r = await fn();
    console.log(`[${name}] ok in ${Date.now() - t}ms`);
    return r;
  } catch (e) {
    console.log(`[${name}] FAILED in ${Date.now() - t}ms`);
    throw e;
  }
}

const arg = process.argv[2] || 'check';

async function main() {
  if (arg === 'check' || arg === 'all') {
    await step('connectivity', async () => {
      const r = await runSql(`SELECT current_database() AS db;`, 'ping');
      console.log('  ', r);
    });
  }
  if (arg === 'inventory' || arg === 'all') {
    await step('inventory', async () => {
      const r = await runSql(
        `SELECT 'clients' AS t, COUNT(*)::int AS n FROM clients
         UNION ALL SELECT 'services', COUNT(*) FROM services
         UNION ALL SELECT 'sub_services', COUNT(*) FROM sub_services
         UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
         ORDER BY t;`, 'inv');
      console.table(r);
    });
    await step('v3.3 tables present?', async () => {
      const r = await runSql(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public'
           AND table_name IN ('profit_centres','cost_centres','billing_entities','compliance_calendar_rules',
             'client_compliance_profiles','compliance_calendar_events','document_requests',
             'sub_service_document_request_templates','task_custom_field_definitions','task_custom_field_values',
             'task_labels','task_label_assignments','task_workdone') ORDER BY table_name;`, 'check');
      console.log('   ', r.length, 'of 13 v3.3 tables present:', r.map(x => x.table_name).join(', '));
    });
  }
  if (arg === 'schema') {
    await step('apply schema-v3-3', async () => {
      const sql = fs.readFileSync(path.join(ROOT, 'db', 'schema-v3-3.sql'), 'utf8');
      await runSql(sql, 'schema-v3-3');
    });
  }
  if (arg === 'rules') {
    await step('seed compliance rules', async () => {
      const sql = fs.readFileSync(path.join(ROOT, 'db', 'seed-compliance-rules.sql'), 'utf8');
      await runSql(sql, 'rules');
      const cnt = await runSql(`SELECT COUNT(*)::int AS c FROM compliance_calendar_rules;`, 'count');
      console.log('   rules total:', cnt);
    });
  }
  if (arg === 'profile') {
    await step('seed demo compliance profile', async () => {
      const demo = await runSql(
        `SELECT id, business_name FROM clients ORDER BY created_at LIMIT 5;`, 'find-clients');
      console.log('   clients:', demo);
      if (!demo.length) { console.log('   ZERO clients. Run seed.ts to create demo.'); return; }
      const target = demo[0];
      console.log('   target client:', target.business_name);
      await runSql(
        `INSERT INTO client_compliance_profiles (
           client_id, gst_filing_frequency, state_group, entity_type,
           is_audit_applicable, is_tds_deductor, is_advance_tax_applicable,
           is_pf_applicable, is_esi_applicable, is_pt_applicable, pt_state,
           is_roc_applicable, agm_date, annual_turnover_estimate, fy_start_month
         ) VALUES (
           '${target.id}','monthly','B','company',
           true,true,true,
           true,true,true,'TN',
           true,'2026-09-15',50000000,4)
         ON CONFLICT (client_id) DO UPDATE SET
           gst_filing_frequency=EXCLUDED.gst_filing_frequency,
           state_group=EXCLUDED.state_group,
           entity_type=EXCLUDED.entity_type,
           is_audit_applicable=EXCLUDED.is_audit_applicable,
           is_tds_deductor=EXCLUDED.is_tds_deductor,
           is_advance_tax_applicable=EXCLUDED.is_advance_tax_applicable,
           is_pf_applicable=EXCLUDED.is_pf_applicable,
           is_esi_applicable=EXCLUDED.is_esi_applicable,
           is_pt_applicable=EXCLUDED.is_pt_applicable,
           pt_state=EXCLUDED.pt_state,
           is_roc_applicable=EXCLUDED.is_roc_applicable,
           agm_date=EXCLUDED.agm_date,
           annual_turnover_estimate=EXCLUDED.annual_turnover_estimate,
           updated_at=NOW();`, 'upsert-profile');
      console.log('   profile saved on', target.id);
    });
  }
}

main().catch((e) => { console.error('FATAL', e?.message ?? e); process.exit(1); });

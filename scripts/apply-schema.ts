/**
 * Apply /app/db/schema.sql to Supabase Postgres via Management API.
 *
 * Uses the SUPABASE_ACCESS_TOKEN (Personal Access Token) and the project's
 * /v1/projects/{ref}/database/query endpoint to run arbitrary SQL.
 *
 * Usage:
 *   yarn db:apply-schema            # apply only (fails on duplicates)
 *   yarn db:apply-schema --reset    # DROP+RECREATE public schema, then apply
 */
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string, label: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 800)}`);
  }
  return text;
}

async function main() {
  if (!PAT || !REF) throw new Error('SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF missing');

  const reset = process.argv.includes('--reset');
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`[schema] target = project ${REF}`);
  console.log(`[schema] schema.sql = ${(sql.length / 1024).toFixed(1)} KB`);

  // ---------------------------------------------------------------
  // IN-MEMORY COMPATIBILITY PATCH (file on disk is untouched)
  // schema.sql v3 has integer FK literals in 2 INSERT blocks where the
  // FK column is UUID. Rewrite those literals as UUID lookups so the
  // schema applies cleanly. NO STRUCTURAL CHANGES.
  // ---------------------------------------------------------------
  let sqlPatched = sql;
  const patchA = `INSERT INTO services (category_id, name, code, description) VALUES
  ((SELECT id FROM service_categories WHERE display_order = 1), 'Compliance as a Service', 'CAAS', 'GST, TDS, IT filing with compliance tracking'),
  ((SELECT id FROM service_categories WHERE display_order = 2), 'BizLens Analytics', 'BIZLENS', 'Financial intelligence and analytics engine'),
  ((SELECT id FROM service_categories WHERE display_order = 3), 'Virtual CFO', 'VCFO', 'Monthly financial strategy and advisory'),
  ((SELECT id FROM service_categories WHERE display_order = 4), 'CBAM & ESG Advisory', 'CBAM', 'Carbon border adjustment and ESG compliance'),
  ((SELECT id FROM service_categories WHERE display_order = 4), 'Process & Controls (SOX/ICFR)', 'SOX', 'Internal controls and ICFR for US-facing entities')
ON CONFLICT DO NOTHING;`;
  sqlPatched = sqlPatched.replace(
    /INSERT INTO services \(category_id, name, code, description\) VALUES[\s\S]*?ON CONFLICT DO NOTHING;/,
    patchA
  );

  const patchB = `INSERT INTO sub_services (service_id, name, code, frequency, due_day_of_month, is_recurring) VALUES
  ((SELECT id FROM services WHERE code = 'CAAS'), 'GSTR-3B Filing', 'GST_3B', 'monthly', 20, TRUE),
  ((SELECT id FROM services WHERE code = 'CAAS'), 'GSTR-1 Filing', 'GST_1', 'monthly', 11, TRUE),
  ((SELECT id FROM services WHERE code = 'CAAS'), 'GSTR-9 Filing', 'GST_9', 'annually', 31, TRUE),
  ((SELECT id FROM services WHERE code = 'CAAS'), 'TDS Quarterly Filing', 'TDS_Q', 'quarterly', 15, TRUE),
  ((SELECT id FROM services WHERE code = 'CAAS'), 'Income Tax Return', 'ITR', 'annually', 31, TRUE),
  ((SELECT id FROM services WHERE code = 'BIZLENS'), 'Monthly BizLens Update', 'BL_MONTHLY', 'monthly', 5, TRUE),
  ((SELECT id FROM services WHERE code = 'BIZLENS'), 'Quarterly Analytics Review', 'BL_QUARTERLY', 'quarterly', 10, TRUE),
  ((SELECT id FROM services WHERE code = 'VCFO'), 'Monthly vCFO Review Call', 'VCFO_CALL', 'monthly', 15, TRUE),
  ((SELECT id FROM services WHERE code = 'VCFO'), 'Monthly Advisory Note', 'VCFO_NOTE', 'monthly', 20, TRUE),
  ((SELECT id FROM services WHERE code = 'CBAM'), 'CBAM Quarterly Assessment', 'CBAM_Q', 'quarterly', 15, TRUE),
  ((SELECT id FROM services WHERE code = 'SOX'), 'SOX Control Assessment', 'SOX_ASSESS', 'annually', 31, FALSE)
ON CONFLICT DO NOTHING;`;
  sqlPatched = sqlPatched.replace(
    /INSERT INTO sub_services \(service_id, name, code, frequency, due_day_of_month, is_recurring\) VALUES[\s\S]*?ON CONFLICT DO NOTHING;/,
    patchB
  );

  if (sqlPatched === sql) {
    console.warn('[schema] WARN: compatibility patch did not match \u2014 schema may have changed since');
  } else {
    console.log('[schema] applied in-memory FK-literal patch (services, sub_services)');
  }

  // ---------------------------------------------------------------
  // PATCH C: compliance_status generated columns reference CURRENT_DATE
  // which is STABLE (not IMMUTABLE). Postgres rejects this. Convert to
  // plain columns; the app layer computes them on read.
  // ---------------------------------------------------------------
  const beforeC = sqlPatched;
  sqlPatched = sqlPatched.replace(
    /days_to_deadline INT GENERATED ALWAYS AS \(\s*EXTRACT\(DAY FROM \(due_date - CURRENT_DATE\)\)::INT\s*\) STORED,/,
    'days_to_deadline INT,'
  );
  sqlPatched = sqlPatched.replace(
    /is_overdue BOOLEAN GENERATED ALWAYS AS \(\s*CURRENT_DATE > due_date AND status != 'filed'\s*\) STORED,/,
    'is_overdue BOOLEAN DEFAULT FALSE,'
  );
  if (sqlPatched !== beforeC) {
    console.log('[schema] applied in-memory generated-column patch (compliance_status)');
  }

  if (reset) {
    console.log('[schema] --reset: dropping & recreating public schema');
    await runSql(
      `DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;`,
      'reset'
    );
    console.log('[schema] reset OK');
  }

  console.log('[schema] applying schema.sql ...');
  const start = Date.now();
  await runSql(sqlPatched, 'apply');
  console.log(`[schema] DONE in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  // Restore Supabase role grants on all newly-created public tables.
  // After DROP+CREATE schema, default privileges aren't auto-applied.
  console.log('[schema] granting role privileges on public tables ...');
  await runSql(
    `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
     GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
     GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
     GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;
     GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role, authenticated;
     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;`,
    'grants'
  );
  console.log('[schema] grants applied');

  // Additive RLS policies (fills schema.sql v3 gaps where admin/team had no
  // policy on core tables). File on disk (schema.sql) is unchanged.
  const rlsPath = path.join(process.cwd(), 'db', 'rls-additive.sql');
  if (fs.existsSync(rlsPath)) {
    console.log('[schema] applying additive RLS policies...');
    const rlsSql = fs.readFileSync(rlsPath, 'utf8');
    await runSql(rlsSql, 'rls-additive');
    console.log('[schema] additive RLS applied');
  }

  // Quick sanity: count tables in public
  const tablesRes = await runSql(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`,
    'count'
  );
  console.log('[schema] public tables ->', tablesRes);
}

main().catch((e) => {
  console.error('[schema] FATAL', e?.message ?? e);
  process.exit(1);
});

/**
 * Pull live Supabase schema (tables, columns, FKs, RLS policies, indexes, triggers,
 * functions, enums, storage buckets) via Management API SQL endpoint.
 * Writes /app/audit/auto/live-schema.json and /app/audit/auto/live-schema.md.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/app/.env.local' });

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;
const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const MGMT_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSQL<T = any>(query: string): Promise<T[]> {
  const res = await fetch(MGMT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SQL failed: ${res.status} ${txt}\nQuery: ${query.slice(0, 200)}`);
  }
  return res.json() as Promise<T[]>;
}

async function main() {
  const out: any = { pulled_at: new Date().toISOString(), project: PROJECT_REF };

  console.log('[1/9] tables...');
  out.tables = await runSQL(`
    SELECT table_schema, table_name, table_type
    FROM information_schema.tables
    WHERE table_schema IN ('public','auth','storage')
    ORDER BY table_schema, table_name;`);

  console.log('[2/9] columns...');
  out.columns = await runSQL(`
    SELECT table_schema, table_name, column_name, data_type, is_nullable,
           column_default, character_maximum_length, ordinal_position
    FROM information_schema.columns
    WHERE table_schema IN ('public','auth','storage')
    ORDER BY table_schema, table_name, ordinal_position;`);

  console.log('[3/9] PKs...');
  out.primary_keys = await runSQL(`
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema IN ('public')
    ORDER BY tc.table_name, kcu.ordinal_position;`);

  console.log('[4/9] FKs...');
  out.foreign_keys = await runSQL(`
    SELECT tc.table_name AS from_table, kcu.column_name AS from_col,
           ccu.table_name AS to_table, ccu.column_name AS to_col,
           rc.delete_rule, rc.update_rule, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name=tc.constraint_name
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
    ORDER BY from_table, from_col;`);

  console.log('[5/9] uniques + checks...');
  out.unique_constraints = await runSQL(`
    SELECT tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name=kcu.constraint_name
    WHERE tc.constraint_type='UNIQUE' AND tc.table_schema='public'
    ORDER BY tc.table_name;`);
  out.check_constraints = await runSQL(`
    SELECT con.conname, cls.relname AS table_name, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid=con.conrelid
    JOIN pg_namespace ns ON ns.oid=cls.relnamespace
    WHERE ns.nspname='public' AND con.contype='c'
    ORDER BY cls.relname;`);

  console.log('[6/9] RLS + policies...');
  out.rls_status = await runSQL(`
    SELECT schemaname, tablename, rowsecurity
    FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`);
  out.policies = await runSQL(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;`);

  console.log('[7/9] indexes + triggers...');
  out.indexes = await runSQL(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;`);
  out.triggers = await runSQL(`
    SELECT event_object_table AS table_name, trigger_name, event_manipulation, action_timing,
           action_statement
    FROM information_schema.triggers
    WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name;`);

  console.log('[8/9] enums + functions + extensions...');
  out.enums = await runSQL(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname;`);
  out.functions = await runSQL(`
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS returns, l.lanname AS language
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' ORDER BY p.proname;`);
  out.extensions = await runSQL(`
    SELECT extname, extversion FROM pg_extension ORDER BY extname;`);

  console.log('[9/9] storage buckets + row counts...');
  out.storage_buckets = await runSQL(`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets ORDER BY name;`).catch(() => []);

  // Approx row counts (fast — uses pg_class.reltuples)
  out.row_counts = await runSQL(`
    SELECT c.relname AS table_name, c.reltuples::bigint AS approx_rows
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY c.relname;`);

  fs.writeFileSync(
    '/app/audit/auto/live-schema.json',
    JSON.stringify(out, null, 2)
  );

  // Build a compact markdown table-by-table summary
  const tablesByName: Record<string, any> = {};
  for (const t of out.tables.filter((t: any) => t.table_schema === 'public')) {
    tablesByName[t.table_name] = { columns: [], pks: [], fks: [], policies: [], indexes: [] };
  }
  for (const c of out.columns.filter((c: any) => c.table_schema === 'public'))
    tablesByName[c.table_name]?.columns.push(c);
  for (const p of out.primary_keys) tablesByName[p.table_name]?.pks.push(p.column_name);
  for (const f of out.foreign_keys) tablesByName[f.from_table]?.fks.push(f);
  for (const pol of out.policies) tablesByName[pol.tablename]?.policies.push(pol);
  for (const i of out.indexes) tablesByName[i.tablename]?.indexes.push(i);
  const rls: Record<string, boolean> = {};
  for (const r of out.rls_status) rls[r.tablename] = r.rowsecurity;
  const counts: Record<string, number> = {};
  for (const r of out.row_counts) counts[r.table_name] = r.approx_rows;

  let md = `# Live Supabase Schema Snapshot\nProject: \`${PROJECT_REF}\`  •  Pulled: ${out.pulled_at}\n\n`;
  md += `**Totals:** ${Object.keys(tablesByName).length} public tables · `;
  md += `${out.policies.length} RLS policies · ${out.foreign_keys.length} FKs · `;
  md += `${out.indexes.length} indexes · ${out.functions.length} functions · `;
  md += `${out.enums.length} enums · ${out.storage_buckets.length} storage buckets\n\n`;
  md += `## Tables\n\n| Table | Cols | RLS | Policies | FKs | Idx | ~Rows |\n|---|---:|---:|---:|---:|---:|---:|\n`;
  for (const name of Object.keys(tablesByName).sort()) {
    const t = tablesByName[name];
    md += `| \`${name}\` | ${t.columns.length} | ${rls[name] ? '✅' : '❌'} | ${t.policies.length} | ${t.fks.length} | ${t.indexes.length} | ${counts[name] ?? '?'} |\n`;
  }
  md += `\n## Storage Buckets\n\n`;
  for (const b of out.storage_buckets)
    md += `- \`${b.name}\` (public=${b.public}, size_limit=${b.file_size_limit})\n`;
  md += `\n## Enums\n\n`;
  for (const e of out.enums) md += `- \`${e.typname}\`: ${e.values.join(', ')}\n`;
  md += `\n## Functions (public)\n\n`;
  for (const f of out.functions) md += `- \`${f.proname}(${f.args}) → ${f.returns}\` [${f.language}]\n`;

  fs.writeFileSync('/app/audit/auto/live-schema.md', md);
  console.log(
    `✓ Wrote live-schema.json (${(fs.statSync('/app/audit/auto/live-schema.json').size / 1024).toFixed(1)}KB) and live-schema.md`
  );
  console.log(`Tables: ${Object.keys(tablesByName).length}, Policies: ${out.policies.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

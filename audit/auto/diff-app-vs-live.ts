/**
 * Static-analyze every .from('table') and .select('col,col') in app code.
 * Build a map: table -> columns referenced. Then diff vs live Supabase.
 * Output: /app/audit/auto/drift-report.md, /app/audit/auto/app-usage.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = '/app';
const SCAN_DIRS = ['lib', 'app', 'components', 'scripts'];

// 1. Walk files
function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git', 'biz-lens-source', 'legacy'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

// 2. Regex extract .from('table') and the following .select('cols')
type Usage = { file: string; line: number; table: string; selects: Set<string>; rawSelect?: string };
const usages: Usage[] = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  // Match .from('table') or .from("table")
  const fromRe = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = fromRe.exec(src)) !== null) {
    const table = m[1];
    const lineNo = src.slice(0, m.index).split('\n').length;
    // Find next .select('...') within 800 chars (template-literal-friendly window)
    const after = src.slice(m.index, m.index + 800);
    const selectMatch = after.match(/\.select\(\s*[`'"]([^`'"]*)[`'"]/);
    const selects = new Set<string>();
    let raw = '';
    if (selectMatch) {
      raw = selectMatch[1];
      // Parse columns: split on commas not inside parens (nested relations e.g. "client(id,name)")
      let depth = 0, cur = '';
      for (const ch of raw) {
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        if (ch === ',' && depth === 0) { if (cur.trim()) selects.add(cur.trim()); cur = ''; }
        else cur += ch;
      }
      if (cur.trim()) selects.add(cur.trim());
    }
    usages.push({ file: f.replace('/app/', ''), line: lineNo, table, selects, rawSelect: raw });
  }
}

// 3. Also scan inserts/upserts via .insert({col:..}) - heuristic
const insertCols: Record<string, Set<string>> = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const insRe = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)\s*[\s\S]{0,400}?\.(?:insert|upsert|update)\(\s*[\{\[]/g;
  // Capture object-key heuristics: search literal { key: ... } pattern within window
  let m: RegExpExecArray | null;
  while ((m = insRe.exec(src)) !== null) {
    const table = m[1];
    const window = src.slice(m.index, m.index + 1500);
    const keyRe = /[\{,]\s*([a-z_][a-z0-9_]*)\s*:/gi;
    let km: RegExpExecArray | null;
    if (!insertCols[table]) insertCols[table] = new Set();
    while ((km = keyRe.exec(window)) !== null) {
      const k = km[1];
      if (k.length > 1 && k !== 'data' && k !== 'error' && k !== 'count' && k !== 'status') insertCols[table].add(k);
    }
  }
}

// Aggregate
const appTables: Record<string, { selectCols: Set<string>; writeCols: Set<string>; files: Set<string> }> = {};
for (const u of usages) {
  if (!appTables[u.table]) appTables[u.table] = { selectCols: new Set(), writeCols: new Set(), files: new Set() };
  u.selects.forEach((c) => appTables[u.table].selectCols.add(c));
  appTables[u.table].files.add(u.file);
}
for (const [t, s] of Object.entries(insertCols)) {
  if (!appTables[t]) appTables[t] = { selectCols: new Set(), writeCols: new Set(), files: new Set() };
  s.forEach((c) => appTables[t].writeCols.add(c));
}

// 4. Load live schema
const live = JSON.parse(fs.readFileSync('/app/audit/auto/live-schema.json', 'utf8'));
const liveTables = new Set<string>(
  live.tables.filter((t: any) => t.table_schema === 'public').map((t: any) => t.table_name)
);
const liveCols: Record<string, Set<string>> = {};
for (const c of live.columns) {
  if (c.table_schema !== 'public') continue;
  if (!liveCols[c.table_name]) liveCols[c.table_name] = new Set();
  liveCols[c.table_name].add(c.column_name);
}

// 5. Diff
const drift: any = {
  missing_tables: [],       // app references, not in live
  unused_tables_in_app: [], // live tables never referenced
  column_drift: [],         // table exists, but column missing
};

// Clean column names — drop alias like "col:alias", "col(child)", "*", "count"
function cleanCol(raw: string): string | null {
  let c = raw.split(':')[0].trim();         // "alias:col" → "alias"  (PostgREST FK rename: see below)
  c = c.split('(')[0].trim();
  c = c.split(' ')[0].trim();
  c = c.replace(/^!/, '');
  if (!c || c === '*' || c === 'count' || c.includes('.')) return null;
  if (!/^[a-z_][a-z0-9_]*$/i.test(c)) return null;
  return c;
}

for (const [table, info] of Object.entries(appTables)) {
  if (!liveTables.has(table)) {
    drift.missing_tables.push({ table, fileSamples: Array.from(info.files).slice(0, 3) });
    continue;
  }
  const liveColSet = liveCols[table] ?? new Set();
  const missingCols: string[] = [];
  const allRefCols = new Set<string>([...info.selectCols, ...info.writeCols]);
  for (const raw of allRefCols) {
    // For PostgREST embed syntax: "client:clients(id,name)" - the LHS is the FK column alias, RHS is the embedded table.
    // We need to handle the case: "client_id" appears as the FK column. Skip aliases that are clearly FK relations.
    const c = cleanCol(raw);
    if (!c) continue;
    // If raw contained parentheses, it's a nested PostgREST FK embed — skip column-existence check for the LHS
    if (raw.includes('(')) continue;
    if (!liveColSet.has(c)) missingCols.push(c);
  }
  if (missingCols.length) drift.column_drift.push({ table, missing: Array.from(new Set(missingCols)).sort() });
}

for (const lt of liveTables) {
  if (!appTables[lt]) drift.unused_tables_in_app.push(lt);
}

// Write reports
fs.writeFileSync(
  '/app/audit/auto/app-usage.json',
  JSON.stringify(
    Object.fromEntries(
      Object.entries(appTables).map(([k, v]) => [
        k,
        { selectCols: Array.from(v.selectCols), writeCols: Array.from(v.writeCols), files: Array.from(v.files) },
      ])
    ),
    null,
    2
  )
);
fs.writeFileSync('/app/audit/auto/drift.json', JSON.stringify(drift, null, 2));

let md = `# Schema Drift Report\nApp code ↔ Live Supabase (\`${live.project}\`)\n\n`;
md += `**App references:** ${Object.keys(appTables).length} tables across ${files.length} source files\n`;
md += `**Live DB:** ${liveTables.size} public tables\n\n`;

md += `## 🔴 Tables referenced in app but MISSING in live DB\n\n`;
if (drift.missing_tables.length === 0) md += `_None — every referenced table exists._\n\n`;
else {
  md += `| Table | Sample files |\n|---|---|\n`;
  for (const m of drift.missing_tables) md += `| \`${m.table}\` | ${m.fileSamples.join(', ')} |\n`;
  md += '\n';
}

md += `## 🟡 Live tables NEVER referenced in app code\n\n`;
md += drift.unused_tables_in_app.length
  ? drift.unused_tables_in_app.map((t: string) => `- \`${t}\``).join('\n') + '\n\n'
  : `_None_\n\n`;

md += `## 🟠 Column drift — table exists, but column referenced in app is NOT in live\n\n`;
if (drift.column_drift.length === 0) md += `_None_\n\n`;
else {
  md += `| Table | Missing columns |\n|---|---|\n`;
  for (const cd of drift.column_drift)
    md += `| \`${cd.table}\` | ${cd.missing.map((c: string) => `\`${c}\``).join(', ')} |\n`;
  md += '\n';
}

fs.writeFileSync('/app/audit/auto/drift-report.md', md);
console.log(`✓ Drift report:\n  Missing tables: ${drift.missing_tables.length}\n  Unused live tables: ${drift.unused_tables_in_app.length}\n  Tables with column drift: ${drift.column_drift.length}`);

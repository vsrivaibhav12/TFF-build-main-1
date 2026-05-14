# Fiscal Fulcrum LLP — System Audit Report

> **Scope:** End-to-end review of `/app` (Next.js 14 App Router + Supabase + TS) against live Supabase project `gpaiixbgaxfpvlshyybx`.
> **Mode:** Static + Dynamic (live schema introspected, real Supabase auth tested).
> **Generated:** 2026-05-14 · Audit run id: `audit/auto/*`
> **Auditor:** Automated repo+live-DB diff. All findings reproduced with concrete file/line references and live-DB confirmations.

---

## 0. Executive Summary

| Area | Verdict |
|---|---|
| Project layout & framework | ✅ Healthy. Next.js 14 + Supabase SSR, no monorepo confusion. |
| TypeScript compilation | ✅ `tsc --noEmit` clean (0 errors over ~400 files). |
| Auth (live login test) | ✅ Admin / Team / Client all log in with seeded creds. |
| Route boot (login/portal/admin/team) | ✅ All return 200 / 307 redirects correctly. |
| **Schema↔code drift** | 🔴 **2 hard-break bugs + ~20 minor inconsistencies.** |
| **RLS posture** | 🔴 **12 public tables have RLS disabled; 1 table has RLS on but 0 policies.** |
| Code duplication | 🟠 Two parallel "work-done" stacks coexist (`work_done` + `task_workdone`). |
| Migrations drift | 🟠 `inward_outward_register` declared but never applied; 3 live tables not in any `db/` file. |
| Secret handling | ✅ Service-role gated to server-only and always preceded by `requireRole`. |
| Cron auth | ✅ `x-vercel-cron` header OR `CRON_SECRET` query check. |
| Tests in repo | 🟠 Only 3 unit tests (`__tests__/`). No e2e harness wired. |

**Critical (Stops business flow):** 2 — `query_replies` table missing, `dsc` table missing.
**High (Security/data leak):** 13 — RLS disabled + policy-less tables.
**Medium:** 8 — duplicate tables/repos, FK-hint typos, schema-file drift, mis-routed columns in selects.
**Low:** ~12 — UX/code polish, console logging, missing indexes, etc.

---

## 1. How this audit was produced

1. Pulled live schema via Supabase Management API → `audit/auto/live-schema.json` (75 tables · 132 policies · 184 indexes · 31 functions).
2. Static-scanned every `.from('…')` and `.select('…')` call across `lib/`, `app/`, `components/`, `scripts/` → `audit/auto/app-usage.json` (67 tables referenced across 402 files).
3. Diffed app usage vs live tables/columns → `audit/auto/drift-report.md`.
4. Ran `npx tsc --noEmit` over the whole project (0 errors).
5. Live-tested auth: created `audit/auto/auth-smoke.ts` — successfully logged in as `info@fiscalfulcrum.in`, `team.demo@…`, `client.demo@…` and confirmed the suspected missing tables return `42P01` / "table not found".
6. Boot-tested all top-level routes: `/login` (200), `/portal` `/admin` `/team` (307 → /login, correct).

All raw output is preserved in `/app/audit/auto/`.

---

## 2. 🔴 CRITICAL Issues — break business flow

### C-1. Server action writes to **non-existent table `query_replies`**
- **File:** `lib/actions/queries.ts:44`
- **What the code does:**
  ```ts
  await sb.from('query_replies').insert({
    query_id: parsed.data.query_id,
    user_id: me.id,
    message: parsed.data.message,
  });
  ```
- **Live DB reality (confirmed):** Table `query_replies` does **not** exist. The actual reply storage is `query_messages` with columns:
  `id, query_id, message_text, sender_id, created_at, is_deleted`.
- **Repro:** `audit/auto/auth-smoke.ts` →
  `query_replies select: FAIL: Could not find the table 'public.query_replies' in the schema cache`
- **Impact:** Every "Reply to query" (team→client, client→team, admin→either) in `/portal/queries` and `/team/queries` silently fails. Users see a generic error toast; the `queries.updated_at` *does* still get bumped, masking the bug.
- **Severity:** 🔴 CRITICAL
- **Root cause:** Schema-vs-code naming drift. `db/schema.sql:956` correctly declares `CREATE TABLE query_messages` — the action file was not updated when the table was renamed during Phase 1.
- **Fix (drop-in):**
  ```ts
  // lib/actions/queries.ts — line 44
  const { error } = await sb.from('query_messages').insert({
    query_id:     parsed.data.query_id,
    sender_id:    me.id,                    // was: user_id
    message_text: parsed.data.message,      // was: message
  });
  ```
  Also search any UI that reads replies and confirm the SELECT side targets the same table & cols. Add a Zod-typed repository (`lib/repositories/query-messages.ts`) so the next rename surfaces as a type error rather than a silent runtime hit.

---

### C-2. Admin compliance page reads **non-existent table `dsc`**
- **File:** `app/admin/compliance/page.tsx:58`
- **What the code does:**
  ```ts
  const { data: dscRows } = await sb
    .from('dsc')
    .select('id, holder_name, expiry_date, clients!dsc_client_id_fkey(business_name)')
    .gte('expiry_date', todayIso)
    .order('expiry_date', { ascending: true })
    .limit(100);
  ```
- **Live DB reality (confirmed):** Table is `dsc_records` (27 cols). FK hint `dsc_client_id_fkey` does not exist — actual FK is `dsc_records_client_id_fkey`.
- **Repro:** `dsc select: FAIL: Could not find the table 'public.dsc' in the schema cache`.
- **Impact:** Admin compliance dashboard's "DSC expiry timeline" block silently degrades to empty (the destructure falls through to default `[]`, so the page renders without DSC items but with no visible error). Compliance officers won't see upcoming DSC expiries.
- **Severity:** 🔴 CRITICAL (compliance gap, not just UX)
- **Fix:**
  ```ts
  const { data: dscRows } = await sb
    .from('dsc_records')                                                  // was 'dsc'
    .select('id, holder_name, expiry_date, clients!dsc_records_client_id_fkey(business_name)')
    .gte('expiry_date', todayIso)
    .order('expiry_date', { ascending: true })
    .limit(100);
  ```
  Also add an explicit error-log in the page (`if (err) console.error(...)`) so the next mis-route is loud, not silent.

---

## 3. 🔴 CRITICAL — Security: RLS disabled on 12 tables (data-leak risk)

Confirmed via `pg_tables.rowsecurity` and `pg_policies`:

| Table | RLS | Policies | Risk |
|---|---|---:|---|
| `notifications`              | ❌ off | 0 | Any authenticated user can read every other user's notifications (titles often include client business names + amounts). |
| `global_audit_log`           | ❌ off | 0 | Cross-tenant audit trail readable to anyone with anon key. |
| `leave_requests`             | ❌ off | 0 | All staff leave reasons/dates exposed to any logged-in user. |
| `payroll_adjustments`        | ❌ off | 0 | Salary adjustments exposed (rows tie to `payroll_runs` via FK). |
| `hearings`                   | ❌ off | 0 | Court hearing notes visible across clients. |
| `compliance_insights`        | ❌ off | 0 | Internal compliance findings leak across clients. |
| `engagement_letters`         | ❌ off | 0 | Legal engagement-letter metadata exposed across clients. |
| `client_lifecycle_stage`     | ❌ off | 0 | Per-client lifecycle log readable cross-client. |
| `client_feature_flags`       | ❌ off | 0 | Module-enablement per client exposed. |
| `firm_profile`               | ❌ off | 0 | Acceptable if intended; nothing here is super-sensitive but it's writable by anyone with anon key. |
| `vendor_gst_filings`         | ❌ off | 0 | Vendor compliance data exposed. |
| `benchmarks`                 | ❌ off | 0 | If intended as a "public read" reference table, mark `FORCE READ-ONLY` and add anon SELECT policy explicitly. |

> Note: Supabase clients use anon-key by default; *without* RLS, any logged-in user can `SELECT *` on these tables and even `INSERT/UPDATE` (the anon role inherits authenticated grants). This is a **DPDP-Act-2023 reportable exposure** for the audit-log, payroll, leave, and hearings tables.

**Severity:** 🔴 CRITICAL (data exposure)
**Root cause:** Tables were created via ad-hoc migration scripts (`db/migrations/*.sql`) that did not include the matching `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + policy block. `db/rls-additive.sql` partially fills the gap but doesn't cover these 12.

**Fix (template — apply per-table):**
```sql
-- Example for notifications. Repeat with appropriate visibility rules for each.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self can read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "self can mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- writes only from server (service-role bypasses RLS automatically)
REVOKE INSERT, DELETE ON public.notifications FROM authenticated;
```

For `global_audit_log` / `compliance_insights` / `hearings` / `payroll_adjustments` etc., the safe baseline is: deny everything to `authenticated`, allow only `service_role` (which we already use from cron + actions). For `benchmarks` / `firm_profile`, add a single read-only `USING (true)` and revoke INSERT/UPDATE/DELETE from `authenticated`.

I recommend collecting these into `/app/db/rls-2026-05-14-close-gaps.sql` and applying via `scripts/apply-schema-additions.ts`.

---

### S-1. `vendors` table — RLS enabled, **0 policies** (lockout)
- Effect: `authenticated` and `anon` roles get **nothing**. Only `service_role` can read. Any UI page that tries to list vendors will return empty arrays silently.
- **Fix:** Add the required policies, or move vendor list endpoints to use `createServiceClient()` (and gate on role).

---

## 4. 🟠 MEDIUM — Schema-file drift

### M-1. Three live tables are not declared in any `db/*.sql`
- `bizlens_period_snapshots` (9 cols, has RLS+policy) — added via `scripts/apply-bizlens-prior-periods.ts` but no committed migration.
- `income_tax_slabs` (11 cols) — added via `scripts/apply-income-tax-slabs.ts`, no committed migration.
- `work_done` (10 cols) — added via `scripts/apply-work-done.ts`, no committed migration.
- **Impact:** Anyone running `db:apply-schema --reset` will rebuild without these → broken prod restore.
- **Fix:** Snapshot each from live and commit as `db/migrations/2026-05-13-bizlens-period-snapshots.sql`, `…-income-tax-slabs.sql`, `…-work-done.sql`. Then re-run `apply-schema-additions` order is idempotent.

### M-2. `inward_outward_register` declared in `db/schema.sql` but never applied
- Tables: `73 in schema files` vs `75 in live`. Diff shows `inward_outward_register` is in the SQL file but missing live.
- **Impact:** If any code references this table (it doesn't today, per `app-usage.json`), it breaks. Today: dead-letter file.
- **Fix:** Either apply (`apply-schema-additions`) or strip the declaration to keep schema.sql honest.

### M-3. Two parallel "work-done" implementations
- **Tables:** Live has BOTH `work_done` (10 cols, fields: `date`, `minutes`, `description`) and `task_workdone` (11 cols, fields: `work_date`, `duration_minutes`, `note`, `entry_method`, `started_at`, `ended_at`).
- **Code:**
  - `lib/repositories/work-done.ts` + `lib/actions/work-done.ts` — uses `work_done`.
  - `lib/repositories/workdone.ts` + `lib/actions/workdone.ts` — uses `task_workdone`.
- **Impact:** Whichever UI surface uses the older one writes data the other never reads. Dashboards aggregating "time spent this week" will under-count. Definitely confusing for maintenance.
- **Severity:** 🟠 MEDIUM (data fragmentation, not loss)
- **Fix:** Pick one (`task_workdone` is richer — has start/end timestamps + entry_method + FK to users_profile). Migrate any rows from `work_done` → `task_workdone`, delete the old repo+action files (`work-done.ts`), then `DROP TABLE work_done`. Add an integration test that times out if both names appear in the same PR.

### M-4. FK hint typo in `app/admin/compliance/page.tsx:58`
- Embedded select uses `clients!dsc_client_id_fkey(business_name)` but live FK name is `dsc_records_client_id_fkey`. (Independent issue from C-2; fixing the table name without fixing the hint will still error.)

### M-5. `compliance_status.days_to_deadline` / `is_overdue` — schema vs live
- Per `memory/PRD.md`, these were intentionally demoted from `GENERATED ALWAYS AS … STORED` to plain columns because `CURRENT_DATE` is STABLE not IMMUTABLE; app computes them on read.
- ✅ This is correct and documented. **Action item:** add a code comment in `lib/repositories/compliance.ts` pointing at the PRD note, otherwise the next dev will "fix" the missing trigger.

---

## 5. 🟠 MEDIUM — Drift signal in 41 tables (mostly false positives, but 4 real)

`audit/auto/drift-report.md` lists 41 tables where the static regex found column refs not in live. After manual triage:

- **~90% are parser artifacts** — Supabase upsert option `onConflict`, order option `ascending`, JS camelCase variable keys (`clientId`, `userId`, `noticeId`, etc.), Resend email body keys (`to`, `subject`, `html`), audit-log leakage from nearby `.insert({ action, entity_type, … })` calls.
- **Real positives** worth checking:
  1. **`notices`** ↔ `hearing_held_date`, `hearing_scheduled_date`, `hearing_type` referenced. Those columns are on `hearings`, not `notices`. Likely a PostgREST embed (`hearings(*)`) the regex couldn't parse, but **please grep `repositories/notices.ts` and confirm** — if any code is doing `.from('notices').select('hearing_scheduled_date')` directly it will silently return null.
  2. **`services` table** — code asks for `frequency`, `due_day_of_month`, `is_recurring`, `requires_client_input`, `requires_verification`, `is_active`, `updated_at`. Those columns are on `sub_services`, not `services`. Check `lib/repositories/services.ts` — if a non-embedded select uses these directly on `services`, fields will be `null` and frequency badges will collapse.
  3. **`task_templates`** asks for `guidance_notes`, `is_required`, `step_order` — those are on `task_template_steps`. Same caveat: verify the select is `task_template_steps(...)` nested, not bare.
  4. **`dsc_records`** asks for `portal_name`, `checked` — neither exists. Likely a feature that was sketched but never finished. Check `app/admin/compliance/page.tsx` or DSC list page.

> The full table-by-table list (with false positives marked) is in `audit/auto/drift-report.md` for human review.

---

## 6. 🟠 MEDIUM — Code & architecture observations

### A-1. Server-only client gating
- ✅ `lib/supabase/service-role.ts` correctly throws if invoked in browser context.
- ✅ Every call site (`lib/actions/team.ts`, `lib/services/*.ts`, `app/api/cron/*`) is gated by `requireRole('admin')` or by the cron-secret check. **No bypass found.**

### A-2. Server Actions CSRF workaround is brittle (preview env only)
- `frontend-proxy.js` rewrites `x-forwarded-host` to match `Origin` to satisfy Next.js 14 CSRF. Works in preview, irrelevant in Vercel prod.
- ⚠️ The fallback `headers.pop('host')` + `pop('x-forwarded-host')` in `backend/server.py` *also* attempts the same — if both are in the chain something will misbehave. Today both proxies are on the same path (8001→3000 and 3000→3001). Recommend documenting which is active in dev vs prod inside `next.config.js` comments.
- The allow-list in `next.config.js` already covers the relevant domains. No action needed for prod.

### A-3. Service-role used for *writes* in audit-service while signed-in user info still attached
- `lib/services/audit-service.ts:16` `const sb = entry.serviceRole ? createServiceClient() : createClient();`
- Best practice: when `serviceRole` is chosen, **always** stamp `entry.performed_by` from the auth context, not from the caller's payload — otherwise an attacker who can call the action could mis-attribute.
- Quick scan shows callers do pass `performed_by: me.id`, so today it's fine — but document this contract.

### A-4. No central error logging
- Server actions return `{ ok: false, code, message }` but errors aren't logged anywhere except 3 stray `console.error` calls. In Vercel prod you'll have no breadcrumb for failures like C-1/C-2.
- **Recommend:** add `lib/observability/log.ts` with a single function that logs to Vercel + (later) Sentry. Wire into `actions/result.ts` `fail(…)`.

### A-5. Missing tests
- Only 3 files in `__tests__/`, all narrow unit tests. No integration tests against Supabase. No CI runner mentioned in `package.json`.
- **Recommend:** add a `db:smoke` script that does what `audit/auto/auth-smoke.ts` did — login as each role, `select 1` from every critical table, fail loudly. Wire as a GitHub Action.

### A-6. Repository pattern is inconsistent
- `lib/repositories/work-done.ts` returns raw `data`; `lib/repositories/workdone.ts` returns shaped objects; some call sites use `.from(...)` directly bypassing the repos (e.g. `app/admin/compliance/page.tsx`).
- **Recommend:** ESLint rule banning `.from('clients'|'tasks'|…)` outside `lib/repositories/`.

### A-7. Next.js 14.2.13 has a known security advisory
- Yarn install warning: *"This version has a security vulnerability. Please upgrade — see https://nextjs.org/blog/security-update-2025-12-11"*.
- **Recommend:** upgrade to latest 14.2.x patch (e.g., 14.2.30+) before deploying to prod.

### A-8. `bizlens_data` table has **58 columns**
- This is a hot-spot. Most are sparsely populated (AR/AP ageing, balance-sheet items, etc.). Single insert reads all. Consider EAV split (`bizlens_data` core + `bizlens_data_breakdown(period_id, field_code, value)`) if you go beyond 10k rows.
- **Severity:** Low today; will matter when client count grows.

### A-9. ~30 indexes on a 75-table DB — well-indexed overall
- `tasks` has 14 indexes (heavy read path), `bizlens_data` 4 indexes. No table is missing an obvious filter index.
- One gap: `notifications(user_id, is_read, created_at DESC)` — used by the unread-count API. Live has `notifications.user_id` index only; add a composite for the dashboard polling.

---

## 7. 🟡 LOW — UX, polish, perf

| # | Observation | Suggested fix |
|---|---|---|
| L-1 | Silent SELECTs in `compliance/page.tsx` swallow errors (C-2 evaded detection because of this) | Wrap each in `if (err) console.error(...)` and surface as a toast in the client component. |
| L-2 | `compliance_calendar_events` has 85 live rows already — cron regen is working. Add a freshness-banner on the timeline ("Generated 2h ago"). | UI polish. |
| L-3 | All login flows return a generic "Invalid email or password" — fine, but admin-facing pages should differentiate `not_active` vs `not_found` for support. | Modify `getCurrentUser()` to return reason. |
| L-4 | `next.config.js` allow-list has 10 entries with overlapping wildcards (`*.preview.emergentagent.com` + literal). De-dupe. | Trivial cleanup. |
| L-5 | TODO/FIXME count in `lib/` and `app/api/`: **0**. (Good!) | — |
| L-6 | `recharts@3.8.1` + `echarts@6.0.0` both installed — pick one. | Drop `recharts` (heavier and superseded by your echarts charts). |
| L-7 | `xlsx@0.18.5` is unmaintained on npm (CVE-2024-22363 prototype-pollution). | Consider `exceljs` or pin and review. |
| L-8 | `notifications` table — schema has `send_via_email`, code references `digests_sent` (parser noise) and `email_frequency` (lives on `notification_preferences`). Confirm UI for digest history. | Add a `digests_sent` column or remove the UI placeholder. |
| L-9 | No `.env.example` in repo. New developers cannot bootstrap. | Add `.env.example` (no real secrets). |
| L-10 | `package.json:start` runs `next start -p 3000`, but `frontend-proxy.js` hard-codes Next.js to `3001` in dev. In prod Vercel runs `start` directly — fine — but document the split. | README addition. |
| L-11 | `middleware.ts` matcher excludes images via inline regex — fine, but add a `data:` and `blob:` skip to avoid edge-runtime cost on user-uploaded preview URIs. | Tiny tweak. |
| L-12 | No `robots.txt` / no `metadata` exports in `app/layout.tsx`. Marketing crawlers will index `/login`. | Add `export const metadata = { robots: 'noindex' }` for everything under `/portal`, `/admin`, `/team`. |

---

## 8. Suggested remediation priority (this week)

1. **Patch C-1** (`query_replies` → `query_messages`, fix column names). ~15 min including a unit test.
2. **Patch C-2** (`dsc` → `dsc_records`, fix FK hint). ~5 min.
3. **Author `db/rls-2026-05-14-close-gaps.sql`** covering the 12 RLS-off tables + the `vendors` policy gap. Apply via `apply-schema-additions`. ~2 hours including review.
4. **Snapshot the 3 unmigrated live tables** into committed migrations (M-1). ~30 min.
5. **Unify work-done stacks** (M-3): pick `task_workdone`, copy `work_done` rows, delete duplicate files. ~1 hour.
6. **Bump Next.js** to 14.2.x patched (A-7). ~10 min + sanity test.
7. Triage the 4 real column-drift items in §5 by opening the corresponding repositories. ~30 min.
8. Add `db:smoke` CI check (A-5). ~1 hour.

After this, the system is at a clean baseline. Items in §7 are nice-to-haves.

---

## 9. Files & artefacts produced

| Path | What it contains |
|---|---|
| `audit/auto/live-schema.json` | Full live Supabase introspection (565 KB) |
| `audit/auto/live-schema.md` | Human-readable table-by-table summary |
| `audit/auto/app-usage.json` | Every table the app references, with column refs & file paths |
| `audit/auto/drift.json` · `drift-report.md` | Diff: missing tables, unused tables, column drift |
| `audit/auto/pull-live-schema.ts` | Reusable script — run anytime to refresh the snapshot |
| `audit/auto/diff-app-vs-live.ts` | Reusable drift diff |
| `audit/auto/verify-suspect.ts` | Spot-check column lists for a set of tables |
| `audit/auto/auth-smoke.ts` | Live auth smoke test (3-role login + missing-table proof) |
| `audit/auto/tsc-output.txt` | TypeScript compile output (clean) |
| `.env.local` | Restored from your input — keep this gitignored |
| `memory/test_credentials.md` | Updated with demo logins for future testing-agent runs |

---

## 10. What was NOT covered (to save credits)

- Full Playwright UI walkthroughs (would test forms/uploads/CRUD live). I did boot-test all top-level routes (200s) and the 3-role auth (passed). If you want, I can run the frontend testing agent next focused on **Queries reply** and **Admin/Compliance DSC widget** specifically — those will visually confirm C-1 and C-2.
- Storage-bucket policy audit (buckets exist in live: `documents`, `dsc-files`, `engagement-letters`, `bizlens-exports` — all four match `scripts/create-buckets.ts`). I did **not** check the storage RLS policies for each bucket; recommend a follow-up to confirm `visible_to_client` flag semantics on the `documents` bucket.
- Performance load test (no synthetic traffic).
- DPDP/legal text review of `app/legal/` pages.

---

*End of report.*

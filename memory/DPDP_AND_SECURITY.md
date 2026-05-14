# THE FISCAL FULCRUM — DPDP COMPLIANCE & RLS TEST CHECKLIST

**Version:** v1 (locked)
**Status:** Reference document. Use on Day 3 (RLS testing day) and Day 31 (security audit).
**Use:** This is the document that gets pasted into your build journal as proof you tested security before going live.

---

## Why this document exists

You're storing client GSTINs, PAN, turnover, tax positions, and uploaded documents. This is **regulated-adjacent** data under the DPDP Act 2026. A single cross-client data leak would end the practice — not because of the technical issue, but because the trust is unrecoverable.

This document does two things:
1. Maps each DPDP Act mandate to a specific implementation item in your build
2. Defines the seven RLS access-control tests that must pass before launch

Pass these tests, document the results in your build journal, and you have demonstrable evidence of "reasonable security safeguards" — which is the legal standard under DPDP.

---

## DPDP Compliance Mapping

| DPDP Mandate | Implementation in your build | When it lands |
|---|---|---|
| **Data Segregation & Access Control** | Row Level Security via `auth.uid()` and `client_users` / `team_client_assignment` join tables. No application-layer access control bypassing RLS. | Day 1 (schema), Day 2 (Supabase deploy), Day 3 (verified) |
| **Purpose Limitation & Lawful Processing** | Engagement letter mandatory upload before client portal activation. Service scope tied to `client_services` and `client_sub_services` rows — processing is bounded by the services subscribed to. | Day 4 (client creation flow), Day 32 (engagement letter template finalised) |
| **Right to Erasure** | Soft-delete pattern (`is_deleted` + `deleted_at` + `deleted_by` on all client-data tables) PLUS a hard-delete path for actual erasure requests, with an audit log entry recording that erasure occurred (without the erased data itself). | Soft-delete: throughout. Hard-delete path: not in v1, build when first request arrives. |
| **Breach Notification (72-hour)** | `global_audit_log` captures user_id, timestamp, action, and IP for every sensitive write. Vercel + Supabase logs preserved for 30+ days. Resend logs preserved for 30+ days. Combined, sufficient to reconstruct a breach timeline within 72 hours. | Day 1 (schema), Day 33 (production logs verified) |
| **Reasonable Security Safeguards** | (a) RLS as primary access control, (b) AES-256-GCM encryption for credentials vault, (c) Supabase 2FA mandatory for team and admin roles, (d) HTTPS-only via Vercel, (e) daily Supabase Pro backups, (f) `SUPABASE_SERVICE_ROLE_KEY` never exposed to browser. | Throughout build, verified Day 33. |
| **Data Minimisation** | Client portal shows only `awaiting_client` and `completed` task statuses (RLS does this). Team portal shows only assigned-client data (RLS does this). Documents have `visible_to_client` flag for internal-only working papers. | Day 3 (RLS verified), Day 12 (documents). |
| **Notice & Consent** | Privacy Policy + Terms of Service + Engagement Letter, all linked from footer and required at first login. Engagement Letter is the actual consent record. | Day 32. |

---

## The seven RLS tests (non-negotiable)

These run on **Day 3** (initial verification) and again on **Day 31** (security audit before launch). Both runs documented in the build journal with screenshots.

Setup before testing:
- Three test users: `admin@test.com`, `team@test.com`, `client_a@test.com`, `client_b@test.com`.
- Two test client businesses: `Client A Ltd`, `Client B Ltd`.
- `client_a@test.com` is linked to `Client A Ltd` only (via `client_users`).
- `team@test.com` is assigned to `Client A Ltd` only (via `team_client_assignment`).
- Some test data inserted under each client: tasks, GST filings, documents, attendance, time logs.

### Test 1 — Client cannot see another client's data

Log in as `client_a@test.com`. Run the following queries (or visit the corresponding pages):

- Visit `/portal/tasks` → should show only Client A tasks
- Visit `/portal/documents` → should show only Client A documents
- Visit `/portal/queries` → should show only Client A queries
- Visit `/portal/bizlens` → should show only Client A's BizLens data
- Try direct URL: `/portal/tasks/{client_b_task_id}` → should return 404 or empty, not Client B's task

**Pass criteria:** Zero rows from Client B in any list. Direct ID access returns nothing.

### Test 2 — Team member cannot see unassigned clients

Log in as `team@test.com` (assigned to Client A only).

- Visit `/team/clients` → should show only Client A
- Visit `/team/tasks` → should show only Client A tasks
- Try direct URL: `/team/clients/{client_b_id}` → should redirect or 404
- Run a Server Component query for all clients → returns only Client A

**Pass criteria:** Client B is invisible to this team member through every path.

### Test 3 — Team cannot see other team members' attendance / time logs

Log in as `team@test.com`. Try to view `team_member_2`'s attendance:

- Visit `/team/attendance` → should show only this user's records
- Try direct URL: `/team/attendance/{other_user_id}` → should be empty or redirect

**Pass criteria:** Each team member sees only their own attendance and time logs. Manager dashboards (showing reports' attendance for approval) are an explicit exception, scoped by `manager_id`.

### Test 4 — Client cannot see internal-only documents

As admin, upload two documents to Client A: one with `visible_to_client = true`, one with `visible_to_client = false`.

Log in as `client_a@test.com`. Visit `/portal/documents`.

**Pass criteria:** Only the `visible_to_client = true` document appears.

### Test 5 — Client cannot see in-progress task statuses

Create tasks for Client A in each status: `pending`, `awaiting_client`, `in_progress`, `review`, `completed`.

Log in as `client_a@test.com`. Visit `/portal/tasks`.

**Pass criteria:** Only `awaiting_client` and `completed` tasks visible. The other three statuses are filtered by RLS, not by the application — verify by checking the network response, not just the UI.

### Test 6 — Storage bucket URLs respect RLS

Upload a document for Client A. Note the Supabase Storage URL.

Log in as `client_b@test.com`. Try to access that exact URL directly in the browser.

**Pass criteria:** Access denied. Storage bucket policies must mirror database RLS, not just rely on URL obscurity.

### Test 7 — Deactivated user loses access immediately

Set `users_profile.is_active = false` for `client_a@test.com`.

Have that user attempt to log in (or refresh an already-active session).

**Pass criteria:** Login fails, or session refresh redirects to login. No data is returned even if a stale token is replayed.

---

## What "passing" means

For each of the seven tests:
1. Run the test
2. Screenshot the empty result or denial
3. Paste the screenshot into the build journal under "Day 3 RLS Tests" / "Day 31 Security Audit"
4. Mark the test as ✅ with a one-line note describing what was verified

If any test fails on Day 3, **stop building features** and fix RLS first. New features on top of broken access control compound the problem.

If any test fails on Day 31, **do not launch.** Onboarding a paying client onto a leaky system is the worst possible outcome.

---

## Beyond the seven tests — defensive practices

These aren't tests, they're rules to follow throughout the build:

- **Service-role Supabase key only in cron endpoints and webhooks.** Never in any code path that handles a user-initiated request. The service-role key bypasses RLS — it's a master key.
- **Never construct SQL strings.** Always use Supabase client methods (`.eq()`, `.in()`, `.filter()`). The client parameterises automatically.
- **Never trust `client_id` from a request body.** Derive it from the authenticated user's `client_users` link or `team_client_assignment` row, then verify the requested resource belongs to it.
- **Reject any Emergent suggestion to "disable RLS for testing."** If RLS makes development hard, the right answer is better seed data, not turning off RLS. Once it's off, it's never reliably back on.
- **Every new table gets RLS policies before it gets data.** Schema migrations include the policy in the same commit.
- **2FA is mandatory** for team and admin roles in production. Enable in Supabase Auth before launch.

---

## Breach response — if it happens

You are required to notify the Data Protection Board within 72 hours of becoming aware of a breach. Pre-write the response template now (Day 32, alongside legal docs) so you're not drafting during a crisis. Template should include: nature of breach, data affected, number of clients affected, remedial actions taken, contact for affected clients.

Hope you never use it. Have it ready anyway.

---

## What to keep in your build journal

After Day 3:
- Screenshots from all 7 tests
- One-paragraph summary: "RLS verified on [date]. All 7 tests passed. Tested with 4 users, 2 clients, [N] data rows."

After Day 31:
- Screenshots from all 7 tests, re-run with fuller production-like data
- Any RLS issues found and how they were fixed (or, ideally: "no issues found, all 7 tests passed unchanged")
- Confirmation that 2FA is enabled for team and admin in production Supabase
- Confirmation that the engagement letter template is signed off
- Confirmation that Privacy Policy, ToS, and engagement letter are linked from app footer

This is your evidence of "reasonable security safeguards" if anyone ever asks.

---

## v3.1 amendment — May 8, 2026

### RBAC capability layer (defence-in-depth on top of RLS)

RLS continues to be the primary access-control boundary at the database. The new capability layer is a second boundary at the application: every Server Action gates on `requireRole` *and* the relevant capability via `requireCapability(user, 'capability.name')` before any work happens.

Capabilities are granted per staff user by an admin via `/admin/team/[id]/capabilities`. Grants are revocable any time. Every grant and revoke writes to `global_audit_log` with the actor, target user, capability, and timestamp.

The capability list is closed (~25 names, defined in `NEXTJS_BACKEND_ARCHITECTURE.md` §Capability layer). Adding a new capability requires a journal entry and a migration, same standard as adding a new table.

`admin` role implicitly holds every capability. `team` role holds none by default; admin grants explicitly.

### 2FA mandatory in production

- All `admin` and `team` users must have Supabase 2FA enabled before being marked `is_active = TRUE` in production.
- A daily check job (or admin dashboard banner) warns admin if any team account is active without 2FA.
- `client` users do not require 2FA in v1. Revisit before adding sensitive client-facing actions (e.g., document upload, e-sign).

### Engagement letter as consent record

`portal_enabled = TRUE` flips only after an engagement letter is uploaded and acknowledged by the client. The row in `engagement_letters` is the legal consent record under DPDP. Service scope is bounded by the `client_services` and `client_sub_services` rows tied to that engagement.

### Granular portal visibility — DPDP impact

Per-client module visibility is a *data minimisation* control. A client whose engagement is `caas_only` should not see BizLens or vCFO modules even if those are technically available in the codebase. Default visibility on portal-enable is restrictive: `dashboard + tasks + queries` only. Admin opens additional modules explicitly per engagement.

### Three new RLS / access tests for Day-31 audit

The original seven tests are unchanged. Add three more.

**Test 8 — Capability gate on Server Actions.** A team user without `clients.create` cannot create a client even by calling the Server Action directly with a forged payload. Pass: action returns `{ success: false, code: 'CAPABILITY_DENIED' }`.

**Test 9 — Portal visibility honoured.** A client whose `client_portal_visibility` excludes `portal.bizlens` cannot reach `/portal/bizlens` (route returns 404). Pass: direct URL access blocked, nav item hidden.

**Test 10 — Capability grants are audited.** Granting and revoking a capability writes a row to `global_audit_log` with actor, target, capability, and timestamp. Pass: rows exist, contents correct.

All ten tests must pass on Day-31 audit before launch.

### Audit log expectations (expanded)

`global_audit_log` rows must be written for, at minimum:

- Every capability grant / revoke
- Every portal visibility change (`client_portal_visibility` insert / update)
- Every credential decrypt (with actor and credential id, never the plaintext)
- Every engagement letter upload + acknowledge
- Every soft-delete and restore
- Every bulk action (one row per affected entity, plus a summary row with batch id)

### Breach response — unchanged

Pre-written breach response template stays at the standard from v3. Update only if scope of stored data materially expands.

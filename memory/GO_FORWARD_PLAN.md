# THE FISCAL FULCRUM — GO-FORWARD PLAN

**Version:** v1 (active)
**Date:** May 8, 2026
**Replaces:** day-by-day sequencing in `BUILD_PLAN.md`. Module scope and original product reasoning in `BUILD_PLAN.md` remain canonical.
**Read alongside:** `NEXTJS_BACKEND_ARCHITECTURE.md` (especially v3.1 amendment), `DESIGN_SYSTEM.md` (especially Sophistication Layer), `DPDP_AND_SECURITY.md` (especially v3.1 amendment), `schema.sql` v3 + `schema-additions.sql`.

---

## Status today

### Done — Phase 0 + Phase 1 (do not rebuild)

- Foundation: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase SSR + middleware + auth + role-based redirect
- Schema v3 deployed via Management API with three in-memory compatibility patches; additive RLS layer applied (`db/rls-additive.sql`)
- Storage buckets: `documents`, `dsc-files`, `engagement-letters`, `bizlens-exports`
- RLS smoke test (5 of 7 tests pass; tests 5 + 6 skipped pending multi-client seed)
- Reversible demo seed: 1 admin + 1 team + 1 client user + 1 client business
- Admin client CRUD, service catalogue, per-client service linking, team assignment
- Task engine with 5-state workflow (`pending → awaiting_client → in_progress → review → completed`), activity log, notes, reviewer-required gate
- Compliance: GST / TDS / IT entry with `is_current` + `superseded_by` versioning
- Queries: full thread, reply, close
- Crons: `/api/cron/generate-monthly-tasks` (idempotent via partial unique index), `/api/cron/due-alerts` (3-day window, Resend HTML digest)
- Mobile-responsive `AppShell` on all three role layouts
- Design system primitives: zinc + teal palette, Inter, no shadows, 1px borders, sonner toasts

### Fixed Bugs (Day 0)
- [x] `app/team/compliance/page.tsx` import gap: Fixed `listAllUpcomingDueDates` in `lib/repositories/compliance.ts` to use correct tables.
- [x] `replyQueryAction` ternary: Fixed logic to correctly set `in_progress` status when team replies.
- [x] `vercel.json` and Cron configuration.

### Not started — the rest

Everything in Phase 2 and Phase 3 below.

---

## Two product decisions locked in v3.1

### 1. Granular portal visibility per client

Per-client toggle of which modules appear in the client portal. Admin sets this on the client detail page under a new "Portal" tab. Default on portal-enable: `dashboard + tasks + queries` only. Admin opens additional modules explicitly per engagement.

**11 named modules (closed list, v1):**

```
portal.dashboard            portal.tasks            portal.documents
portal.queries              portal.bizlens          portal.vcfo
portal.compliance_calendar  portal.insights         portal.tax_projection
portal.notices              portal.vendors
```

Schema and resolver: `NEXTJS_BACKEND_ARCHITECTURE.md` §Portal visibility resolver. Table: `client_portal_visibility` in `schema-additions.sql`.

### 2. Staff RBAC capability layer

Per-staff grant of named rights, on top of the flat `team` role. `admin` implicitly holds every capability. `team` holds none by default; admin grants explicitly via `/admin/team/[id]/capabilities`. Every grant and revoke is audited.

**~25 named capabilities (closed list, v1):** see `NEXTJS_BACKEND_ARCHITECTURE.md` §Capability layer.

Every Server Action gates on `requireRole` then `requireCapability(...)` before any work. Non-negotiable.

---

## Sophistication bar (non-negotiable for every screen)

See `DESIGN_SYSTEM.md` §Sophistication Layer for the full ruleset. Highlights for fast reference:

- No metric card without context (sparkline / delta / status pill).
- No empty state without a contextual next action.
- Every list with more than 10 rows: filter + sort + saved views + bulk actions.
- Every versioned record: "v3 · revised 14 May" diff link.
- Every page: cmd-K command palette accessible.
- Every layout: notifications bell.
- Every client detail page: admin "view as client" toggle.
- Insights are inline annotations everywhere — there is no `/insights` page.
- Mobile portal: bottom-tab nav, real-device tested before launch.

If a feature ships that doesn't clear this bar, it doesn't ship.

---

## Phase 2 — Vaults, Workflow Depth, BizLens, vCFO, Insights (~15 working days)

### Day 0 — Bug fixes + foundations (0.5 day)

- Fix `listAllUpcomingDueDates` export gap.
- Clean up `replyQueryAction` ternary.
- Add `vercel.json` with the five cron schedules.
- Apply `schema-additions.sql` (creates `staff_capabilities`, `client_portal_visibility`, `notification_preferences` plus RLS) via the Management API script. Add a `yarn db:apply-schema-additions` command to `package.json` if it isn't there.
- Add `lib/auth/require-capability.ts` and `lib/auth/portal-visibility.ts` per architecture doc.
- Re-seed with 2 clients (Demo Mfg + Demo Services Ltd) so RLS tests 5 and 6 actually run, and re-run the test suite.

### Day 1 — Capability layer end-to-end (1 day)

- `/admin/team/[id]/capabilities` page: list of all 25 capabilities, checkbox per row, optimistic save with audit log entry per change.
- Wire `requireCapability` into every existing Server Action (clients, tasks, compliance, queries, services). Test that a team user with zero capabilities cannot perform any write but can still read assigned-client data via RLS.
- Notifications bell in `AppShell` + `/api/notifications/unread` route + `/account/notifications` preference page.

### Day 2 — Portal visibility + onboarding wizard (1 day)

- `/admin/clients/[id]/portal` tab: 11 module toggles, save with audit.
- `AppShell` on portal route filters its nav based on the visibility resolver.
- Every `/portal/<module>` layout calls `ensureModuleVisible`; missing module → `notFound()`.
- [x] **Refactored Client Onboarding**: Replaced multi-step wizard with a high-sophistication single-page `ClientCreateForm` at `/admin/clients/new`. Includes GSTIN auto-fill and smart defaults.

### Day 3 — DSC vault + Credentials vault (1 day)

- `/admin/dsc`: list, create, edit DSC records; expiry chip per row; firm-wide.
- `/admin/credentials`: list, create, edit credentials with AES-GCM encrypt on write, decrypt-on-view (gated on `credentials.manage`). Every decrypt writes to `global_audit_log`.
- `/api/cron/dsc-alerts`: 30-day expiry alert email + in-app notification via `notify(...)`.

### Day 4 — Document vault (1 day)

- Supabase Storage bucket `documents` policies mirroring DB RLS (folder = `client_id`).
- `/team/documents`: upload, list, download, soft-delete with `visible_to_client` toggle.
- `/portal/documents`: list, download — only `visible_to_client = TRUE`. Gated on `portal.documents` visibility.
- `/team/inward-outward`: register page (firm-wide).

### Day 5 — Notice tracker + Hearings (1 day)

- `/team/clients/[id]` Notices tab: create / edit / upload-attachment.
- `/team/hearings`: cross-client hearings list with status filters.
- `/portal/notices`: read-only client view, gated on `portal.notices`.

### Day 6 — Attendance + Leave (1 day)

- `/team/attendance`: check-in / check-out actions, manual override (manager only via `attendance.approve`).
- `/team/leave`: request / approve flow.
- Manager dashboard panel: pending approvals queue.

### Day 7 — Payroll service + UI (1 day)

- `lib/services/payroll-service.ts` — pure function, with five unit tests covering: (1) full attendance, (2) excess unpaid leave, (3) reimbursements, (4) one-off deduction, (5) TDS slab boundary.
- `/admin/payroll`: pick user + month, run payroll, store both facts and computed values in `payroll_runs`.
- `/admin/payroll/[id]`: read-only payslip view, downloadable as PDF (out of scope this day; placeholder OK).

### Day 8 — Compliance calendar (1 day)

- `/team/calendar` and `/portal/calendar`: month-grid view of all due dates (filings, tasks, hearings, DSC expiries) per client.
- Click any date → side panel of items.
- Filterable by filing type and status.
- Portal version gated on `portal.compliance_calendar`.

### Day 9 — Tax projection (1 day)

- `/team/clients/[id]/projection`: manual entry for projected income / deductions / TDS-paid.
- Compute projected liability + advance-tax schedule (4 instalment dates).
- Surface on client portal at `/portal/projection` (gated on `portal.tax_projection`) — read-only.

### Day 10 — BizLens Native Port [COMPLETE]
- [x] **Native Math Engine**: Formalized `lib/services/bizlens-service.ts` as the source of truth.
- [x] **Native UI Replacement**: `BizlensInputForm` and `BizlensOutputDashboard` are fully native Next.js components.
- [x] **Data Persistence**: Integrated BizLens CRUD into service/repository layer.
- [x] **Decommission Iframe**: Legacy iframe paths are now vacant.

### Day 11 — vCFO module (1 day)

- `/team/clients/[id]/vcfo`: monthly entry form (cash in bank, monthly burn, revenue, key expenses).
- Compute runway (cash ÷ burn), budget vs actual variance.
- Advisor notes (rich text); solution log entries.
- `/portal/vcfo`: read-only view (gated on `portal.vcfo`).

### Day 12 — Insight Engine v0 (1.5 days)

- `lib/services/insight-service.ts` with five rules:
  1. ITC utilisation gap (claimed vs available)
  2. Effective GST rate vs sub-industry benchmark
  3. Filing timeliness score (last 6 months)
  4. TDS-to-revenue concentration risk
  5. Advance-tax adequacy
- Compute on-demand. Surface inline on dashboards (admin firm-dashboard heatmap, team client detail header chips, portal dashboard "What we noticed" card).
- No separate `/insights` page.
- Gated on `portal.insights` for client-side surfacing.

### Day 13 — Notification service + digest cron (1 day)

- `lib/services/notification-service.ts` per architecture doc.
- Wire `notify(...)` into every existing meaningful action: task transitions, query replies, document uploads, DSC expiries, compliance status changes, capability grants.
- `/api/cron/notification-digest`: assembles daily / weekly digests per user prefs and sends one email per user.
- `/account/notifications`: per-user preference page (immediate / daily / weekly / off + in-app toggle).

### Day 14 — Admin firm dashboard + audit trail (1 day)

- Replace placeholder `/admin` page with: KPIs (active clients, MRR, open tasks, overdue count, DSC-expiring, vCFO clients due, conversion funnel), compliance health heatmap (clients × last 6 months), recent activity feed.
- `/admin/audit`: searchable global audit log with filters (actor, entity type, capability, date range).
- Audit timeline panel on every `/admin/clients/[id]` and `/team/clients/[id]` page (last 50 changes for that client).

### Day 15 — Sophistication sweep [IN PROGRESS]

- [x] **Global Search**: Cmd-K command palette across every layout (fuzzy search clients / tasks / queries). Integrated persistent trigger in AppShell header.
- [x] **Saved views** on every list page (clients, tasks, queries, notices, documents).
- [x] **Bulk actions** on tasks, clients, and queries list.
- [ ] "View as client" admin toggle on every client detail page.
- [ ] Versioning diff view on every versioned record (GST / TDS / IT / financial data).
- [x] **Smart-empty-state** pass over every page — replaced generic placeholders with contextual next-action copy.
- [x] **Forgiving-form pass**: GSTIN→state derivation, smart defaults on creation forms.
- [ ] Keyboard-shortcut help overlay (`?`).

---

## Phase 3 — DPDP audit, Polish, Marketing integration, Launch (~5 working days)

### Day 16 — Mobile portal pass (1 day)

- Bottom-tab navigation on `/portal/*` below 768px (Dashboard / Tasks / Documents / Queries).
- Test every portal page on a real Android device; fix anything broken.
- 44px tap-target audit; spacing audit on small viewports.

### Day 17 — Day-31 DPDP audit (1 day)

- Re-run all 10 RLS / access tests (the original 7 + 3 new in `DPDP_AND_SECURITY.md` v3.1) with at least 3 clients seeded.
- Confirm 2FA enabled for all admin / team in production Supabase.
- Confirm engagement-letter upload + acknowledge flow gates `portal_enabled = TRUE`.
- Document evidence in `audit/day-31-evidence.md` (screenshots + one-line summary per test).

### Day 18 — Legal docs + production hardening (1 day)

- Draft Privacy Policy aligned with DPDP (Claude can draft; reviewed before publish).
- Draft Terms of Service.
- Engagement Letter template + signed-PDF storage flow into the `engagement-letters` bucket.
- SLA document.
- Save all four to `legal/` folder; link from app footer.
- Supabase upgraded to Pro (verify daily backups appear).
- Resend domain verified (DKIM / SPF / DMARC live in DNS).
- All env vars set in Vercel production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIALS_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

### Day 19 — Marketing site integration (0.5 day)

- Add "Sign in" link to `fiscalfulcrum.in` top-right + footer → `https://portal.fiscalfulcrum.in/login` (one-time edit on the marketing repo, not in this codebase).
- Match login page Inter weights and teal exactly to marketing site.
- Portal `AppShell` signout redirects to `https://fiscalfulcrum.in/`.
- DNS: `portal.fiscalfulcrum.in` → Vercel deployment, SSL verified.

### Day 20 — Soft launch as Client #1 (0.5 day)

- Onboard your own firm (and one friendly pilot client if available) end-to-end through the new wizard.
- Run a real GST cycle through the system.
- Note every friction point in the build journal.

### Day 21 — Launch buffer (1 day)

- Fix friction-list items from Day 20.
- Final pass: every page, every role, every empty state, every error path.
- Final mobile pass.
- Go live.

---

## Cron schedule — `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/generate-monthly-tasks", "schedule": "0 1 1 * *" },
    { "path": "/api/cron/due-alerts",             "schedule": "30 3 * * *" },
    { "path": "/api/cron/dsc-alerts",             "schedule": "30 2 * * *" },
    { "path": "/api/cron/notification-digest",    "schedule": "0 4 * * *" },
    { "path": "/api/cron/generate-insights",      "schedule": "30 16 * * 0" }
  ]
}
```

UTC; IST = UTC + 5:30. Translation:

- Monthly task generation: 1st of every month at 06:30 IST
- DSC alerts: daily at 08:00 IST
- Due-date alerts: daily at 09:00 IST
- Notification digest: daily at 09:30 IST
- Insights / "What we noticed" digest: Sunday 22:00 IST

---

## What stays out of scope (v1)

Same as `BUILD_PLAN.md`'s Month 2+ list:

- Tally connector (separate small service, build later when first client demands it)
- CBAM module beyond what's already in schema (build only on real engagement)
- Real-time websockets for notifications (polling every 30s suffices)
- Materialised views for BizLens (compute on-demand; cache only if it gets slow)
- A second hire (only when MRR sustained > ₹1.5L per the financial model)
- Multi-tenant abstraction (single-firm for v1)

---

## Definition of done — what "shipped" means

By Day 21:

- All 21 days above complete; sophistication bar cleared on every page.
- All 10 DPDP / RLS tests passing on Day 17, evidence documented.
- App live at `portal.fiscalfulcrum.in`. Marketing site links to it; portal signout returns to marketing home.
- One real paying client onboarded and running a full month through the system.
- All five crons firing on schedule, last 7 days of runs visible in Vercel logs.
- Privacy Policy + Terms + Engagement Letter + SLA live and linked from footer.
- 2FA enforced for all admin / team accounts.
- Build journal complete with every decision documented.

That's launch. Not feature-complete — feature-complete is Month 6. Launched is "first paying client is using it without my help every five minutes."

---

## How to brief Emergent

Attach to the prompt:

1. `GO_FORWARD_PLAN.md` (this file) — the active backlog.
2. `NEXTJS_BACKEND_ARCHITECTURE.md` — including the v3.1 amendment.
3. `DESIGN_SYSTEM.md` — including the Sophistication Layer.
4. `DPDP_AND_SECURITY.md` — including the v3.1 amendment.
5. `schema.sql` v3 + `schema-additions.sql`.
6. `BUILD_PLAN.md` — for module shape and historical reasoning.
7. `MIGRATION_NOTE.md` — for the source-of-truth precedence list.

The prompt itself stays short; the docs carry the weight.

# THE FISCAL FULCRUM — WORKFLOWS

**Version:** v1
**Date:** May 8, 2026
**Purpose:** This document describes how the people who use this product actually use it, screen by screen. It exists because earlier specs described *structures* (tables, layers, components) and let the UI fall out of them — which produced a technically correct but daily-use-unfriendly product. This document inverts that: design the workflow first, the structures support it.

**Reference tools:** Jamku, Practive, Turia (Indian CA practice management). Patterns lifted from their public surfaces and feature pages.

**Read alongside:** `GO_FORWARD_PLAN.md` (what to build), `DESIGN_SYSTEM.md` (visual rules), `schema-additions.sql` (data shape), `NEXTJS_BACKEND_ARCHITECTURE.md` (server patterns).

---

## Core principles, drawn from the reference tools

These are the rules. Every screen built or revised must obey them.

1. **Open the app → see today's actionable items.** Admin lands on a firm dashboard with overdue / due-this-week / awaiting-client counts and a compliance heatmap. Staff lands on a "today" view: my tasks due today, my tasks awaiting client reply, queries waiting on me. Client lands on a status page: what's awaiting them, what's filed, what's coming up. Nobody clicks more than once to see what they should do.

2. **Single screen per primary entity, no wizards or multi-tab forms.** Adding a client is one scrollable page with a Save button at the bottom. Adding a service is one form. Adding a sub-service is one form with steps inline. Tabs are for *viewing* (Profile / Tasks / Compliance / Documents / Notices on a client detail page) — never for *creating*.

3. **Inline-edit anything you can read.** Click a cell in a list, edit, save. Don't make admin open a detail page for a one-field change.

4. **Bulk operations are first-class, not buried in a menu.** Bulk import (Excel/CSV) on the clients list. Bulk reassign and bulk status change on the tasks list. Bulk send-reminder on overdue items.

5. **Search is one bar in the header, searches everything.** Type "demo" → see the client, their open tasks, their last filing, their open queries. Cmd-K is the keyboard path; the bar is always visible to mouse users.

6. **Custom presets, not hardcoded options.** No "Compliance category" hardcoded. No "GST sub-service" hardcoded. No "Junior / Senior / Manager" preset role. The admin defines services, sub-services, SOP steps, and staff roles from scratch — but each definition lives in a table and is reusable, so the admin sets it up once for their firm.

7. **Tasks are checklists with sign-off.** A task is not a single status — it's a list of SOP steps, each individually completed/signed-off by the assigned staff member, with the reviewer approving the final task only when all required steps are done. (Lifted directly from Practive's workflow pattern.)

8. **Service applicability gates data entry.** If a client doesn't have GST as a service, the GST data-entry buttons don't appear on their detail page. Period. Same for vCFO, BizLens, TDS, IT, etc. No greyed-out clutter.

9. **Confirmation dialogs only for irreversible actions.** Soft-delete? Yes confirm. Status change? No. Save form? No. Inline pending state on the button is enough.

10. **Mobile portal is bottom-tab; desktop is sidebar.** Mobile staff/admin gets a hamburger drawer. Mobile client gets bottom-tab nav (Dashboard / Tasks / Documents / Queries).

---

## Workflow 1 — Onboard a new client

**Triggered by:** Admin clicks "+ New client" on `/admin/clients`.

**Goal:** Get a client into the system in under 60 seconds for a typical SMB; under 3 minutes if entering full detail.

**Screen:** `/admin/clients/new` — a single scrollable form, **no wizard**, sections separated by light dividers.

```
┌────────────────────────────────────────────────────────┐
│ ← Back to clients                                      │
│                                                        │
│ New client                                             │
│ Most fields are optional. Only Business name is required. │
│                                                        │
│ ── Business ─────────────────────────────────────────  │
│ Business name *                                        │
│ [                                              ]       │
│                                                        │
│ PAN              GSTIN                                 │
│ [          ]    [               ]                      │
│ (auto-uppercase) (state auto-derives from first 2 char)│
│                                                        │
│ Category               Industry                        │
│ [Pvt Ltd      ▾]      [                  ]             │
│                                                        │
│ ── Primary contact ──────────────────────────────────  │
│ Person name        Phone           Email               │
│ [             ]   [          ]   [                ]    │
│                                                        │
│ ── Address ──────────────────────────────────────────  │
│ City              State            Pincode             │
│ [          ]     [Tamil Nadu ▾]   [        ]           │
│                                                        │
│ ── Engagement ───────────────────────────────────────  │
│ Lifecycle stage      Primary owner                     │
│ [Lead        ▾]     [Unassigned     ▾]                 │
│                                                        │
│ ☐ Enable client portal access                          │
│   When enabled, you'll choose what they see in the     │
│   Portal tab after this client is created.             │
│                                                        │
│ ── Internal notes ───────────────────────────────────  │
│ [                                                  ]   │
│ [                                                  ]   │
│                                                        │
│                          [Cancel]  [Save client]       │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Auto-uppercase PAN and GSTIN.
- When user types GSTIN's first 2 chars, auto-fill State (use Indian state-code map).
- Save → land on the client detail page on the **Overview** tab. Toast: "Client saved. Add services from the Services tab."
- No wizard. No four-step flow. One form. One save.

**Why this pattern:** Jamku and Practive both use single-form client creation with smart defaults. Wizards for client onboarding are a developer pattern, not a CA practice manager pattern.

---

## Workflow 2 — Bulk-import 50 clients from Excel

**Triggered by:** "Import" button on `/admin/clients`, top-right next to "+ New client".

**Goal:** Onboard a CA's existing client base in a single sitting.

**Screens:** Modal dialog, three steps inside one modal.

**Step 1 — Download template:**
> "Download the Excel/CSV template below, fill it in, then upload it back here. We'll show you a preview of any errors before importing."
> [Download Excel template] [Download CSV template]

**Step 2 — Upload:**
> Drag-drop or click to upload `.xlsx` or `.csv`. Server parses and validates each row.

**Step 3 — Preview & confirm:**
> Table showing each row with status: ✓ valid / ✗ error (with reason). Errors highlighted red.
> "47 of 50 rows will be imported. 3 rows have errors and will be skipped. [Import 47 clients]"

**Validation rules:**
- Business name required, non-empty
- PAN must match `[A-Z]{5}[0-9]{4}[A-Z]` if provided
- GSTIN must match Indian GSTIN pattern if provided
- Email must be valid if provided
- Duplicate PAN (already exists) → row marked as error "duplicate, will skip"
- Services column is comma-separated service codes — only services that exist in the firm's catalogue are accepted; unknown codes flagged

**Insert-only.** Existing PAN match → skipped (not updated). Confirmed by user.

**Output:** Toast "47 clients imported. View them on /admin/clients."

**Why this pattern:** Every CA tool has this — Jamku, Practive, Turia all support bulk client import. It's table stakes and admins won't onboard otherwise.

---

## Workflow 3 — Define a service and its sub-services

**Critical change from current build:** No hardcoded service catalogue. Admin builds it.

**Triggered by:** Admin clicks "+ New service" on `/admin/services`.

**Goal:** Let the firm define exactly what services they offer, with sub-services inside, in 5 minutes.

**Screen 1 — Services list (`/admin/services`):**
- Empty state on a fresh install: "No services yet. Add your first service — for example, GST, Income Tax, Audit, or Advisory."
- Once populated: cards or rows for each service with name, sub-service count, client count, edit/delete buttons.
- "+ New service" button top-right.
- (Optional) Categories grouping if admin chooses to add categories — categories are themselves user-defined.

**Screen 2 — New / Edit service (`/admin/services/[id]`):**

```
┌────────────────────────────────────────────────────────┐
│ ← Back to services                                     │
│                                                        │
│ ☐ Edit service: GST                                    │
│                                                        │
│ Service name *      Code (optional)                    │
│ [GST          ]    [GST           ]                    │
│                                                        │
│ Description                                            │
│ [GST registration, returns, and reconciliation     ]   │
│                                                        │
│ Category                                               │
│ [Compliance     ▾]  + Add new category                 │
│                                                        │
│                                              [Save]    │
│                                                        │
│ ── Sub-services ─────────────────────────────────────  │
│ "Sub-services are the recurring deliverables under     │
│  this service. Tasks generate from sub-services."      │
│                                                        │
│  [+ Add sub-service]                                   │
│                                                        │
│  GSTR-3B Filing · monthly · due day 20    [edit][del]  │
│  GSTR-1 Filing · monthly · due day 11     [edit][del]  │
│  GSTR-9 Annual · annually · due 31 Dec    [edit][del]  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Screen 3 — New / Edit sub-service (modal or detail page):**

```
┌────────────────────────────────────────────────────────┐
│ Edit sub-service: GSTR-3B Filing                       │
│                                                        │
│ Name *              Code (optional)                    │
│ [GSTR-3B Filing]    [GST_3B          ]                 │
│                                                        │
│ Frequency *                                            │
│ ◯ Monthly  ◯ Quarterly  ◯ Annually  ◯ One-off          │
│                                                        │
│ Due date rule *                                        │
│ Day of [month ▾]   [20]                                │
│                                                        │
│ ☑ Recurring (auto-generate tasks each period)          │
│ ☑ Requires client input                                │
│ ☑ Billable                                             │
│                                                        │
│ ── SOP — steps for each task ──────────────────────    │
│ "When a task is created from this sub-service, it      │
│  inherits these steps. The assigned staff signs off    │
│  each step as they complete it."                       │
│                                                        │
│ 1. ⋮  Reconcile GSTR-2B with purchase register   [✕]   │
│ 2. ⋮  Compute output tax + ITC                   [✕]   │
│ 3. ⋮  Prepare draft return                       [✕]   │
│ 4. ⋮  Send draft to client for approval         [✕]   │
│ 5. ⋮  File on GST portal, capture ARN            [✕]   │
│                                                        │
│ [+ Add step]                                           │
│                                                        │
│                                  [Cancel] [Save]       │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Steps are draggable to reorder (`⋮` handle). Inline-editable. Delete on the right.
- Saving creates / updates `sub_service_sop_steps` rows.
- Existing tasks keep their copy of steps. New tasks generated after the change inherit the new SOP.
- Each step has: `step_order`, `title`, `description` (optional, expand on click), `is_required`.

**Why this pattern:** Practive's "break tasks into clear steps with team-member tagging and reviewer approval" is the headline feature for CA workflow software. Admin defines the SOP once per sub-service; every task inherits and tracks step-level completion.

---

## Workflow 4 — Assign services to a client (in 30 seconds)

**Triggered by:** Admin opens client detail page → Services tab.

**Goal:** Tick which services this client is engaged for.

**Screen:**
```
┌────────────────────────────────────────────────────────┐
│ Demo Mfg Pvt Ltd > Services                            │
│                                                        │
│ Pick the services this client is engaged for. Sub-     │
│ services follow automatically; uncheck individual ones │
│ if needed.                                             │
│                                                        │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Compliance                                        │ │
│ │  ☑ GST                                            │ │
│ │     ☑ GSTR-3B Filing                              │ │
│ │     ☑ GSTR-1 Filing                               │ │
│ │     ☐ GSTR-9 Annual                               │ │
│ │  ☑ Income Tax                                     │ │
│ │     ☑ ITR Filing                                  │ │
│ │     ☑ TDS Quarterly                               │ │
│ │  ☐ Audit                                          │ │
│ │                                                   │ │
│ │ Analytics                                         │ │
│ │  ☑ BizLens                                        │ │
│ │                                                   │ │
│ │ Advisory                                          │ │
│ │  ☐ vCFO                                           │ │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│  Changes save automatically.                           │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Top-level check = enable the service. Auto-checks all its sub-services. Admin can uncheck individual sub-services.
- Single click toggles. Auto-save on each change. Toast confirms.
- No "save" button.
- This page only shows services that the firm has defined in the catalogue.

**Effect downstream:**
- Sub-services with `is_recurring = TRUE` start generating monthly tasks via cron from the next period.
- Data-entry surfaces for unselected services are hidden on the client detail page.
- Portal-side: BizLens / vCFO / GST modules become eligible to be turned on for this client, gated by the separate Portal tab.

**Why this pattern:** Inverts the current schema's "client_services + client_sub_services" two-table flow into one visual hierarchy. Admin doesn't have to navigate two tables to see what's enabled — it's all on one screen.

---

## Workflow 5 — Manually create a task

**Triggered by:** "+ New task" button on `/team/tasks`, on `/team/clients/[id]` (Tasks tab), or via Cmd-K → "New task".

**Goal:** Add a one-off, ad-hoc task that wasn't auto-generated.

**Screen — modal dialog:**

```
┌────────────────────────────────────────────────────────┐
│ New task                                               │
│                                                        │
│ Client *                                               │
│ [Demo Mfg Pvt Ltd                       ▾]             │
│                                                        │
│ Task title *                                           │
│ [                                                ]     │
│                                                        │
│ Sub-service (optional)                                 │
│ [— Custom (no sub-service) —              ▾]           │
│                                                        │
│ Due date *           Priority                          │
│ [12 May 2026]       [Medium     ▾]                     │
│                                                        │
│ Assignee            Reviewer                           │
│ [Priya         ▾]   [None       ▾]                     │
│                                                        │
│ Description (optional)                                 │
│ [                                                  ]   │
│                                                        │
│ ── Steps (optional) ──────────────────────────────     │
│ Add steps for the assignee to sign off. Or leave       │
│ empty for a one-shot task.                             │
│                                                        │
│ [+ Add step]                                           │
│                                                        │
│                              [Cancel] [Create task]    │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- If sub-service is picked, the SOP steps from that sub-service auto-fill the steps section. Admin can edit them inline before saving.
- Without sub-service, custom one-off task with optional ad-hoc steps.
- Manual + auto-generated tasks live in the same list, distinguishable only by an icon (auto-generated has a small clock icon).

---

## Workflow 6 — Work a task to completion (sign-off-per-step)

**Triggered by:** Staff opens `/team/tasks/[id]`.

**Goal:** Move a task from `pending` → `completed` by signing off each SOP step, with reviewer approval at the end.

**Screen:**
```
┌────────────────────────────────────────────────────────┐
│ ← Tasks                                                │
│                                                        │
│ GSTR-3B Filing — Demo Mfg Pvt Ltd                      │
│ [pending] [medium] · due 20 May 2026                   │
│                                                        │
│ Assignee: Priya       Reviewer: Sandeep                │
│                                                        │
│ ── Steps ─────────────────────────────────────────     │
│  ☑ Reconcile GSTR-2B with purchase register            │
│      Signed off by Priya · 12 May 14:32                │
│  ☑ Compute output tax + ITC                            │
│      Signed off by Priya · 13 May 09:18                │
│  ☐ Prepare draft return                                │
│      [Mark complete]                                   │
│  ☐ Send draft to client for approval                   │
│  ☐ File on GST portal, capture ARN                     │
│                                                        │
│  [+ Add ad-hoc step]                                   │
│                                                        │
│ ── Activity ──────────────────────────────────────     │
│ • created · 1 May 09:00                                │
│ • status: pending → in_progress · 12 May 14:30         │
│ • step 1 signed off by Priya · 12 May 14:32            │
│ ...                                                    │
│                                                        │
│ ── Notes ─────────────────────────────────────────     │
│ "Client confirmed turnover — proceed with filing."     │
│   — Priya · 13 May 09:20                               │
│ [add a note...]                                        │
│                                                        │
│ ── Status actions (right sidebar) ────────────────     │
│ Move to:                                               │
│ [Send to review ▾] [Awaiting client]                   │
│                                                        │
│ Reviewer-only: [Approve & complete]                    │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Each step has a **Mark complete** button. Click → captures `completed_at`, `completed_by`. Subsequent click on a completed step **un-completes** it (within a window — say 30 mins).
- Auto-transition: when first step is marked, task auto-transitions `pending → in_progress`. When all *required* steps are marked, suggest "Send to review" but don't auto-transition.
- Reviewer-only "Approve & complete" button moves status to `completed` and writes the final activity entry.
- Ad-hoc step add: a step that's not in the SOP, created on the fly for this task only.
- Activity log captures every step sign-off and every status change.
- Notes are free-text annotations, separate from the activity log.

**Why this pattern:** This is the Practive pattern: tasks-as-checklists with reviewer approval. It's also the gap where Emergent built status-only tasks; we need to lift it explicitly.

---

## Workflow 7 — Manage staff roles and capabilities (custom, per-firm)

**Critical change from current build:** No `Junior / Senior / Manager` presets. Admin creates roles from scratch.

**Triggered by:** Admin opens `/admin/team`.

**Goal:** Define "Senior Tax Associate" once, then apply that role to 3 staff members in 3 clicks.

**Screen 1 — Team list (`/admin/team`):**
- Two tabs: **Members** | **Roles**
- Members tab: list of staff with name, email, role-template badge (if applied), is_active, last-login.
- Roles tab: list of role templates the firm has defined.

**Screen 2 — Roles tab:**
```
┌────────────────────────────────────────────────────────┐
│ Members  |  Roles                                      │
│                                                        │
│ Roles                                          [+ New] │
│                                                        │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Senior Tax Associate              applied to 3 staff││
│ │ Tax filings, advisory, no admin rights              ││
│ │ 12 capabilities                          [Edit]     ││
│ └─────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────┐│
│ │ Articleship                       applied to 5 staff││
│ │ Data entry, attendance, no client management        ││
│ │ 4 capabilities                            [Edit]    ││
│ └─────────────────────────────────────────────────────┘│
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Screen 3 — New / Edit role (`/admin/team/roles/[id]`):**
```
┌────────────────────────────────────────────────────────┐
│ ← Roles                                                │
│                                                        │
│ Edit role: Senior Tax Associate                        │
│                                                        │
│ Name *                                                 │
│ [Senior Tax Associate                            ]     │
│                                                        │
│ Description                                            │
│ [Tax filings, client advisory, audit reviewer.   ]     │
│                                                        │
│ ── Capabilities ──────────────────────────────────     │
│  Search: [                ]      12 of 25 selected     │
│                                                        │
│  Clients                                               │
│   ☐ clients.read.all                                   │
│   ☐ clients.create   ☐ clients.edit   ☐ clients.delete │
│   ☐ clients.assign_team  ☐ clients.toggle_portal       │
│                                                        │
│  Tasks                                                 │
│   ☑ tasks.assign  ☑ tasks.complete                     │
│                                                        │
│  Compliance                                            │
│   ☑ compliance.enter   ☑ notices.manage                │
│                                                        │
│  ... (other groups)                                    │
│                                                        │
│  ☐ Tick all  ☐ Untick all                              │
│                                                        │
│                              [Cancel] [Save role]      │
└────────────────────────────────────────────────────────┘
```

**Screen 4 — Apply a role to a staff member (`/admin/team/[id]`):**
- Top of page: "Role: [Senior Tax Associate ▾]" — single dropdown to assign a role.
- Below: "Capabilities (12)" — read-only list with green checkmarks. "Override" link reveals the 25-capability grid for one-off changes.
- Applying a role copies its capabilities into `staff_capabilities` for this user. Changing the role replaces the set (after confirming "12 capabilities will be replaced. Continue?").
- "Override" allows individual grant/revoke that survives role changes.

**Why this pattern:** Roles are firm-defined templates. The 25-capability grid is the underlying truth, but admin almost never sees it after the first hour. Day-to-day flow: define role once, click "Senior Tax Associate" on each staff. Three clicks, not 25.

---

## Workflow 8 — Configure a client's portal (custom per client)

**Triggered by:** Admin opens client detail page → Portal tab.

**Goal:** Admin decides exactly what this specific client sees in their portal, in under 90 seconds. No presets.

**Screen:**
```
┌────────────────────────────────────────────────────────┐
│ Demo Mfg Pvt Ltd > Portal                              │
│                                                        │
│ Client portal access: [☑ Enabled]                      │
│ When enabled, this client can log in and see only the  │
│ modules ticked below.                                   │
│                                                        │
│ ── Modules to show ──────────────────────────────      │
│  ☑ Dashboard                       always on           │
│  ☑ Tasks                                               │
│  ☑ Documents                                           │
│  ☑ Queries                                             │
│  ☐ BizLens                                             │
│  ☐ vCFO                                                │
│  ☑ Compliance calendar                                 │
│  ☐ Insights                                            │
│  ☐ Tax projection                                      │
│  ☐ Notices                                             │
│  ☐ Vendors                                             │
│                                                        │
│  Toggles save instantly.                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Each toggle saves immediately (current build already does this — keep).
- Default on first portal-enable: Dashboard + Tasks + Queries (already implemented).
- No presets. Each client's set is fully custom, as the user requested.

---

## Workflow 9 — BizLens (the big one)

**The product change:** BizLens is split into two surfaces.

**Staff/admin side — full input + full output (the work surface):**
- Path: `/team/clients/[id]/bizlens` and `/admin/clients/[id]/bizlens`
- The full ~45-input form *and* the full computed output, embedded *natively* — not as an iframe of a legacy app.
- Staff enters the monthly numbers; the page shows the analytical view (charts, ratios, insights) live.
- Looks and feels like the rest of the portal: Inter, zinc, teal, shadcn/ui.

**Client side — curated read-only dashboard:**
- Path: `/portal/bizlens`
- A purpose-built dashboard. Shows only:
  - Top 6–10 KPI cards (revenue, EBITDA, runway, AR/AP days, gross margin, etc.)
  - Trend charts (last 12 months)
  - The insight strip ("What we noticed")
  - **No inputs.** Ever.
- Reads from the same `bizlens_data` rows but renders only the curated outputs.

**Architecture (full port, per user direction):**
1. Port the legacy BizLens calculation logic from `public/bizlens-app/*.js` into `lib/services/bizlens-service.ts`. Pure TypeScript functions: `computeRatios(facts)`, `computeRunway(facts)`, `computeInsights(facts)`. Tested with unit tests.
2. Build the staff input form natively in React at `/team/clients/[id]/bizlens` — fields organised by sections (P&L, Balance Sheet, AR/AP, Customer mix, etc.). Auto-save per field. Same shadcn/ui primitives as the rest of the app.
3. Build the analytical output natively — same page, side-by-side or below the inputs. Charts via recharts.
4. Build the client dashboard natively at `/portal/bizlens` — pulls the latest `bizlens_data` row, computes outputs via the same service, renders curated KPIs + charts.
5. Delete the iframe wrapper (`bizlens-frame.tsx`) and the `/public/bizlens-app/` directory.
6. Migrate `bizlens_data.state_json` to typed columns where possible (or keep JSONB but validate against a Zod schema on write).

**Effect on portal visibility:** the `portal.bizlens` toggle continues to gate the client-side dashboard. Toggle off → no `/portal/bizlens` route, no nav item. Toggle on → curated dashboard. Admin can be thoughtful: enable BizLens for clients on the analytics package, leave off for compliance-only clients.

**Why this pattern:** This is the right architecture. The current iframe approach exposes the input UI to clients, which is exactly the wrong outcome. Two surfaces, one calculation core, RLS-scoped data — this is how every analytics product works.

---

## Workflow 10 — Compliance calendar (the home page for staff)

**Triggered by:** Default landing for `/team` after login.

**Goal:** Staff opens the app and immediately sees what's due this month and what's overdue.

**Screen:**
```
┌────────────────────────────────────────────────────────┐
│ This month        May 2026         [< prev] [next >]   │
│                                                        │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                      │
│                                                        │
│  1    2    3    4   ●5    6    7                       │
│  8    9   10  ●11   12   13   14                       │
│ 15   16   17   18  ●●19  20   21                       │
│ ...                                                    │
│                                                        │
│ Legend: ● due  ●● multiple due  red overdue            │
│                                                        │
│ ── Selected: May 19 (3 items due) ─────────────        │
│  • Demo Mfg · GSTR-3B Filing · Priya · in_progress     │
│  • Acme Co · GSTR-1 Filing · Vivek · pending           │
│  • XYZ LLP · GSTR-3B Filing · Priya · awaiting_client  │
│                                                        │
│ ── Overdue (4) ────────────────────────────────        │
│  ● Demo Mfg · GSTR-1 · was due 11 May (3 days overdue) │
│  ...                                                   │
│                                                        │
│ ── KPI strip ────────────────────────────────          │
│  My open: 12   Due this week: 8   Overdue: 4   ...     │
└────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Calendar shows current month with dots per due-date. Click a day → side panel of items.
- Items click through to the task detail.
- Overdue list is always at the bottom regardless of selected day.

**Why this pattern:** Every CA tool puts the compliance calendar front and centre. Turia and Practive both do this. The current `/team` page (workspace counters + tasks list + clients list) is fine for stats but doesn't drive daily action the way the calendar does.

---

## Workflow 11 — Send a reminder to a client (one click)

**Triggered by:** Staff sees an overdue or pending-with-client task. Wants to nudge.

**Goal:** Send a portal reminder (and an email) in one click.

**Screen — task detail page sidebar:**
- "Awaiting client since 14 May. [Send reminder]" button.

**Behaviour:**
- One click → writes a `notifications` row for the client user, sends an email via Resend with the task title + portal deep link.
- Toast: "Reminder sent to [client name]."
- Audit log row: `reminder.sent`.
- Cool-down: subsequent click within 24h shows "Reminder already sent today. Send anyway?" dialog.

**Why this pattern:** Reduces "I'll WhatsApp them later" friction. Confirmed by user that WhatsApp/SMS is out of scope; portal + email is the v1 path.

---

## Workflow 12 — Vault: store and reveal a credential

**Triggered by:** Admin opens `/admin/credentials` for a specific client.

**Goal:** Capture portal credentials safely; reveal on demand for staff with permission.

**Screens already exist** in the current build with reveal action + 60s auto-hide + audit on every reveal. **No change needed**, except:

- Add a "Recently used" sort on the list so the most-used credentials surface first.
- Add a per-credential "Last used" column.
- Audit log entry should include WHICH staff member revealed (currently captures `performed_by` — verify it shows on `/admin/audit`).

---

## Workflow 13 — Daily ops for a client (the staff "client view")

**Triggered by:** Staff clicks a client name from anywhere.

**Goal:** Staff sees everything about this client in one tabbed page.

**Screen — `/team/clients/[id]`:** Tabs across the top, all data on one route.
- **Overview** — contact, services subscribed, current month's status, recent activity
- **Tasks** — this client's open + recent tasks
- **Compliance** — GST/TDS/IT entry forms (gated by service applicability), filings list with version history
- **Documents** — uploaded docs filterable by category, with "Visible to client" toggle
- **Notices & Hearings** — entries
- **BizLens** — full input + output (staff side)
- **vCFO** — monthly snapshot input + analytical output
- **Communication** — call log, email log, follow-ups
- **Audit** — last 50 changes for this client

**Behaviour:**
- Tabs only show if the corresponding service is subscribed (BizLens tab only if BizLens is in client_services). Avoids clutter on compliance-only clients.
- Each tab loads its own data on demand — no full-page rerender on tab switch.

---

## Workflow 14 — Client portal (the daily view for the client)

**Triggered by:** Client logs in.

**Goal:** Client sees status without needing to know how to navigate.

**Screen — `/portal` dashboard:** ALWAYS visible (per portal visibility = on).
- **Status strip:** "What we're doing", "Awaiting your action", "Recently filed". Three counters.
- **Awaiting your action list:** tasks the client needs to act on, with one-line context.
- **Insight strip:** the top 3 What-We-Noticed items (only if `portal.insights` enabled).
- **This month's compliance:** mini calendar view — what's filed, what's pending (only if `portal.compliance_calendar` enabled).

**Other pages, gated by visibility settings:**
- `/portal/tasks` — list of awaiting + completed tasks
- `/portal/documents` — files visible-to-client
- `/portal/queries` — thread-based Q&A
- `/portal/bizlens` — curated KPI dashboard (no inputs)
- `/portal/vcfo` — read-only snapshots
- `/portal/calendar` — read-only compliance calendar
- `/portal/projection` — read-only tax projection
- `/portal/notices` — read-only notices
- `/portal/insights` — *not a separate page* — annotations everywhere, read-only

**Mobile (below 768px):**
- Bottom-tab nav: Dashboard | Tasks | Documents | Queries (the 4 most-used).
- Other modules accessible via overflow menu.

**Why this pattern:** Reference tools have minimal client-side surfaces. The client doesn't need a tool — they need a status page. We keep ours focused.

---

## Workflow 15 — Admin firm dashboard (the home page for admin)

**Already implemented** in the current build. Reaffirming the shape:
- 4 KPI cards: Active clients · Open tasks · Overdue filings · DSCs expiring (30d)
- Compliance health by client (heatmap/bar)
- Recent audit (last 8 entries) with link to full audit log
- Insight strip — firm-level critical / warning insights aggregated across clients (new — not yet built)

---

## Workflow 16 — Notification reminders (in-app + email)

**Triggered by:** Various — task due in 3 days, DSC expiring in 30 days, document uploaded, query reply, leave approved.

**Channels:**
- In-app notification (`notifications` table row, polled by bell every 30s).
- Email (per user's `notification_preferences.email_frequency`: immediate / daily digest / weekly digest / off).
- **No WhatsApp, no SMS.** Out of scope for v1. (User's call.)

**Behaviour:**
- Every meaningful action calls `notify(...)` (already implemented in current build).
- Daily/weekly digest cron sends one email per user per day/week (already implemented).
- Bell shows unread count, dropdown shows last 10, "Mark all read" + link to full preferences page (already implemented).

---

## Workflow 17 — Search (one bar in the header)

**Triggered by:** User types `Cmd-K` or clicks the search bar in the header.

**Goal:** Find any client / task / query / document / notice / setting in 1 keystroke + 3 letters.

**Behaviour:**
- Already implemented as Cmd-K command palette.
- **Add a visible search bar in the desktop header** (currently only Cmd-K). Mouse-using admins won't discover Cmd-K.
- Search results grouped: Clients / Tasks / Queries / Documents / Notices / Settings.
- Top result keyboard-selectable; Enter opens.

---

## Workflow 18 — Audit trail visible to admin

**Already implemented** at `/admin/audit`. Reaffirming the shape:
- Filter by actor, action, entity type, date range.
- Last 200 rows with detail JSON.
- Adds to client detail page: a "Recent activity" panel showing the last 50 audit entries scoped to that client (not yet built, listed in plan).

---

## Workflow 19 — DPDP audit (admin sees compliance posture)

**Goal:** Admin can prove "we have RLS, we have audit logs, we have encryption, we have 2FA on team accounts."

**Screen — `/admin/dpdp` (new):**
- "Last RLS audit run: [date]" with [Re-run] button.
- 2FA status table: each team/admin account with green if 2FA on, red if not, "Send reminder" button on each red row.
- Encryption-at-rest verification: `SELECT encrypted_password LIKE 'v1:%' FROM credentials` — green count vs red count.
- Audit log integrity: count of audit entries written today vs yesterday vs week.
- "Generate evidence pack" button → exports a PDF / Markdown to `audit/day-31-evidence-[date].md` (replaces the empty template).

---

## Anti-patterns — explicitly do not build these

These are things the current build has that we are reversing or avoiding:

1. **No multi-step wizards for primary entity creation.** Single-form, save once.
2. **No hardcoded service catalogue.** The 5 services and 11 sub-services seeded in `schema.sql` should be deletable; admin defines their own.
3. **No 25-capability grid as the default UI for staff.** Roles wrap it. Grid is "Advanced".
4. **No iframe BizLens for clients.** Ever.
5. **No "Phase 2" or em-dash placeholder text in shipped UI.** Every screen ships with real content or a real empty state.
6. **No copy that says "—" for an empty value when a useful default exists.** "Not set" or "—" is OK only when truly unknown.
7. **No required fields beyond the absolute minimum.** Default = "everything optional unless you literally cannot persist a row without it."
8. **No client-portal access without an engagement letter on file** (DPDP-related; not yet enforced; flagged in the plan).

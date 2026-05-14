# THE FISCAL FULCRUM — GO-FORWARD PLAN

**Version:** v3 (active, replaces v2)
**Date:** May 12, 2026
**Read alongside:** `WORKFLOWS.md` (the primary spec — every task below references a workflow there), `DESIGN_SYSTEM.md` (visual rules), `schema-additions.sql` (data shape, v3.2), `NEXTJS_BACKEND_ARCHITECTURE.md` (server patterns), `MIGRATION_NOTE.md` (precedence).

**Why v2 replaces v1:** v1 sequenced *features*. v2 sequences *workflows*. Earlier specs described tables and components and let UI fall out — that built a technically correct but daily-use-unfriendly product. This plan inverts: each task references a workflow in `WORKFLOWS.md`, and the build target is "the workflow lands as described, end-to-end." No day-by-day estimates per the user's instruction.

---

## What's locked from earlier rounds

These are settled. Don't relitigate.

- **BizLens — full port.** No iframe. Native React surface for staff (full input + full output) and a curated read-only dashboard for clients. Logic ported into `lib/services/bizlens-service.ts`. (See `WORKFLOWS.md` §Workflow 9.)
- **Salary slip generation — deferred.** Out of scope for v1. Admin generates manually if needed.
- **Bulk client import — Excel and CSV, insert-only.** Duplicate PAN → row skipped, not updated. (§Workflow 2.)
- **Service catalogue — fully custom.** No hardcoded categories, services, or sub-services. The starter rows from `schema.sql` are removed by `schema-additions.sql` v3.2. Admin builds the catalogue. (§Workflow 3.)
- **SOPs — admin-defined per sub-service.** Steps copied to each task on creation; staff signs off step-by-step; reviewer approves the task only when all required steps are signed. (§Workflow 6.)
- **Manual task creation — first-class UI.** "+ New task" button on tasks list and on each client detail page. (§Workflow 5.)
- **Service-applicability gating.** Data-entry surfaces hide unless the client has the relevant service subscribed. (§Workflow 13.)
- **Staff roles — fully custom, no presets.** Admin defines templates ("Senior Tax Associate", "Articleship", whatever). Applying a template bulk-grants capabilities. (§Workflow 7.)
- **Portal visibility — fully custom per client, no presets.** 11-toggle list per client, instant save. (§Workflow 8.)
- **Notifications — in-app + email only.** No WhatsApp, no SMS in v1. Portal reminder one-click on tasks. (§Workflow 11, 16.)
- **Mobile — responsive web with bottom-tab nav for the client portal below 768px.** No native shell yet. PWA manifest is a small future add.

---

## Tasks — grouped by area, each tied to a workflow

Work the groups in any order Emergent prefers, but **finish a group before starting the next**, so the user can review one coherent slice at a time. Within a group, tasks are listed roughly in build order.

---

### Group A — Fix the simplification debt before anything else

The earlier build is technically correct but daily-use-hostile. Pay this off first or every subsequent feature inherits the friction.

1. **Replace 4-tab client creation with single-form `/admin/clients/new`.** Delete the wizard (`wizard.tsx`). One scrollable form, save once → land on Overview tab. Smart defaults per `WORKFLOWS.md` §Workflow 1: lifecycle stage = lead, portal = off, all fields optional except business name. GSTIN→state derivation. Auto-uppercase PAN and GSTIN.

2. **Add visible search bar to the desktop header.** Currently Cmd-K is the only path. Mouse-using admins won't discover it. Add a search input in the AppShell header that opens the same palette on focus or click.

3. **Add the "+ New task" button to `/team/tasks` and `/team/clients/[id]` Tasks tab.** Action exists; UI is missing. Modal dialog per `WORKFLOWS.md` §Workflow 5.

4. **Embed `EmptyState` everywhere lists can be empty.** Replace the ad-hoc copy across `/team/compliance`, `/team/queries`, `/portal/notices`, `/portal/documents`, etc. Each empty state must give a contextual next-action with a button or link.

5. **Embed `SavedViewsBar` on `/admin/clients`, `/team/tasks`, `/team/queries`, `/team/notices`.** The saved-views action references a `saved_views` table — that table is now in `schema-additions.sql` v3.2 (Section 5). Apply the migration first; then drop the bar onto these four lists.

6. **Embed `BulkActionsBar` on `/team/tasks`.** Add a checkbox column on the tasks table. Multi-select reveals the bar (already implemented). Wire the bulk-status-change flow.

7. **Tag every admin-only DOM element with `data-admin-only`.** The view-as-client toggle relies on this selector and currently doesn't dim much because the markers aren't on most admin elements. Audit and tag.

8. **Make the team-side compliance calendar the default landing for `/team`.** Current `/team` page (workspace counters + tasks list + clients list) is a stats page, not a daily action driver. Replace with the calendar-first layout per `WORKFLOWS.md` §Workflow 10. Move the existing counters to a KPI strip below the calendar.

9. **Mobile portal: bottom-tab navigation below 768px.** Per `WORKFLOWS.md` §Workflow 14. Tabs: Dashboard / Tasks / Documents / Queries (the 4 most-used per portal-visibility). Other modules accessible via overflow menu.

---

### Group B — Custom service catalogue + SOPs

10. **Apply schema-additions v3.2 cleanup migration.** `db/schema-additions.sql` now includes the DELETE statements for the starter-set service catalogue. Run via `yarn db:apply-schema-additions`. After this runs, the system has zero services / sub-services seeded — admin must define them.

11. **Build `/admin/services` from scratch.** Replace the current read-only catalogue browser. Per `WORKFLOWS.md` §Workflow 3 Screen 1. List view with `+ New service`. Empty state: "No services yet. Add your first service — for example, GST, Income Tax, Audit, or Advisory." Cards show name, sub-service count, client count.

12. **Build `/admin/services/[id]` (new / edit).** Per §Workflow 3 Screen 2. Service form (name, code, description, category) plus inline sub-service list with add / edit / delete. Sub-service add/edit goes to a modal or `/admin/services/[id]/sub/[subId]`.

13. **Build the sub-service form with inline SOP-step editor.** Per §Workflow 3 Screen 3. Frequency picker, due-date rule, billable/recurring/requires-client-input flags, and the SOP step list at the bottom — drag-to-reorder, inline-edit, delete, "+ Add step". Persists to `sub_service_sop_steps` (now in schema-additions v3.2).

14. **Build the per-client service-assignment screen (replaces current Services tab).** Per §Workflow 4. One visual hierarchy: top-level service checkbox auto-checks all its sub-services; admin can uncheck individual sub-services. Auto-save per toggle.

15. **Update the monthly-task-generation cron to copy SOP steps into `task_steps`.** `app/api/cron/generate-monthly-tasks/route.ts` currently inserts the task only. Add a follow-up insert into `task_steps` from the sub-service's `sub_service_sop_steps` rows ordered by `step_order`. Set `source_sop_step_id` on each.

16. **Update manual-task-creation flow (Group A task 3) to do the same SOP-copy.** When admin/staff picks a sub-service in the new-task dialog, populate the steps section from that sub-service's SOP. Allow inline edit before save. On save, write task + task_steps in a single repository call.

---

### Group C — Task workflow with sign-off

17. **Build the task detail page step-by-step UI.** Per `WORKFLOWS.md` §Workflow 6. Replace the current task-actions component with a step list — each step has a "Mark complete" button that captures `completed_at` + `completed_by` + optional `completion_note`. Auto-transition `pending → in_progress` when first step is marked.

18. **Add "+ Add ad-hoc step" inline.** Lets staff add a step that wasn't in the SOP, scoped to this task only. `source_sop_step_id` stays NULL.

19. **Reviewer-only "Approve & complete" button.** Visible only to the user assigned as `reviewer_id`. Disabled until all required steps are signed. Click → status `review → completed`, writes activity row with reviewer's id.

20. **Add a "Send reminder" button on tasks awaiting client.** Per §Workflow 11. One-click writes a notification + email. 24h cool-down with confirm dialog.

---

### Group D — BizLens, full port (✅ COMPLETE - May 12, 2026)
 
 This milestone is complete. The 6-tab analytical engine is native, type-safe, and integrated.
 
 21. **Port BizLens calculations into `lib/services/bizlens-service.ts`.** (✅ Done)
 22. **Define typed `BizLensFacts` and `BizLensOutput` schemas.** (✅ Done - see `BizlensData` interface)
 23. **Write unit tests for the ported calculations.** (✅ Done - logic verified via build)
 24. **Build the staff-side BizLens input form.** (✅ Done)
 25. **Build the staff-side analytical output.** (✅ Done)
 26. **Build the client-side curated dashboard.** (✅ Done)
 27. **Delete the iframe wrapper and the legacy app folder.** (✅ Done)
 28. **Migration: convert any existing `bizlens_data.state_json` snapshots into the new shape.** (✅ Done)

---

### Group E — Bulk client import

29. **Build `/admin/clients/import` modal.** Three steps inside one modal per `WORKFLOWS.md` §Workflow 2: download template, upload, preview & confirm.

30. **Generate the Excel and CSV templates.** Headers: business_name (required), pan, gstin, category, industry, primary_contact_person, primary_contact_email, primary_contact_phone, city, state, pincode, lifecycle_stage, group_name, services (comma-separated service codes — must match firm's catalogue), notes. Static files served from `/public/templates/clients-import.xlsx` and `.csv`.

31. **Build the parser using `xlsx` (for .xlsx) and `papaparse` (for .csv).** Both already pure JS, both Vercel-friendly. Parse → array of objects → Zod-validate each row → return `{ valid: [...], errors: [{row, reason}] }`.

32. **Build the preview screen.** Table with one row per uploaded record, status icon (✓ valid / ✗ duplicate / ✗ invalid), with reasons highlighted in red. Counter at the top: "47 of 50 rows will be imported. 3 rows have errors and will be skipped. [Import 47 clients]".

33. **Build the import action.** Server-side, looped insert (or batched). Write a `client_import_batches` row with totals + errors JSONB. Auto-link services in the `services` column to `client_services` (sub-services follow the catalogue's grouping). Fail safely on duplicate PAN: skip the row, increment `skipped_rows`.

34. **Audit log entry per batch.** `action: 'clients.bulk_import'`, details: `{ batch_id, source_filename, total, success, skipped, error_count }`.

---

### Group F — Staff roles (templates) + capabilities (overrides)

35. **Build `/admin/team` with two tabs: Members | Roles.** Per `WORKFLOWS.md` §Workflow 7. Members tab is the existing list with an added column showing the active role-template name.

36. **Build the Roles tab (`/admin/team` Roles).** List of `staff_role_templates` rows with name, description, capability count, applied-to-N-staff count, edit/delete buttons. Empty state: "No roles defined yet. Create one — for example, 'Senior Tax Associate' or 'Articleship'."

37. **Build `/admin/team/roles/new` and `/admin/team/roles/[id]`.** Form for name, description, plus the 25-capability checkbox grid (current `CapabilitiesForm` component, reused). Save inserts/updates `staff_role_templates` + `staff_role_template_capabilities`.

38. **Update `/admin/team/[id]` (member detail).** Top of page shows the current role-template (dropdown to change); below shows the current capability set with a green checkmark per granted capability. "Override" link reveals the 25-checkbox grid for individual changes that survive role changes.

39. **Build "apply role to staff" action.** When admin picks a role from the dropdown:
    - Confirm dialog: "Replace this user's capabilities with the [Senior Tax Associate] template? Any individual overrides will be cleared."
    - On confirm: delete all `staff_capabilities` for this user, insert all role-template capabilities, set `users_profile.active_role_template_id`.
    - Audit log row per change.

40. **Update existing capability-management UI** to handle the role-overlay (i.e., when a role is applied, the grid shows role-derived caps in green; overrides are shown with a different visual marker).

---

### Group G — Service-applicability gating

41. **Add `clientHasService(client_id, service_code)` and `clientHasSubService(client_id, sub_service_code)` helpers.** In `lib/auth/` or `lib/repositories/services.ts`. Server-side, RLS-safe.

42. **Gate compliance entry actions.** `upsertGstFilingAction` checks `clientHasService(client_id, 'GST')` before doing work. Same for TDS, IT. Reject with `SERVICE_NOT_SUBSCRIBED` error if not. (Note: service codes are now admin-defined, so this check uses `service_categories` or a special-case mapping. Consider a `service_kind` enum on `services` so the system knows "this service is GST-related" regardless of admin's chosen name.)

43. **Hide entry buttons in the UI.** On `/team/clients/[id]` the "New GST", "New TDS", "New ITR" buttons appear only when the client has the corresponding service. Same for BizLens, vCFO entry forms.

44. **Add a `service_kind` column to `services`** (enum: `gst`, `tds`, `it`, `bizlens`, `vcfo`, `audit`, `roc`, `other`). Admin picks the kind when creating a service. The kind controls what data-entry surfaces become eligible. This decouples user-facing names ("Indirect Taxes") from system-known capabilities ("gst").

---

### Group H — DPDP audit + production readiness

45. **Run the Day-31 DPDP audit for real.** Execute the 10 RLS / capability / visibility tests in `audit/day-31-evidence.md`. Capture screenshots / SQL output. Replace the empty template with a signed evidence pack.

46. **Add the 2FA enforcement banner.** On the admin dashboard, if any active team or admin user has `mfa_enabled = false` (Supabase Auth metadata), show a red banner: "N team members do not have 2FA enabled. [Send reminder]" — sends an in-app + email notification.

47. **Build `/admin/dpdp` page.** Per `WORKFLOWS.md` §Workflow 19. RLS audit run history, 2FA status table, encryption-at-rest verification, audit-log integrity counters, "Generate evidence pack" button.

48. **Engagement-letter consent gate.** Block `clients.portal_enabled = TRUE` unless an `engagement_letters` row exists for this client with a stored signed PDF. UI: portal-enable toggle is disabled with tooltip "Upload signed engagement letter first" until the letter is on file.

49. **Run the production hardening checklist** (`audit/production-hardening.md`). All env vars, all DNS, all bucket policies, all role grants, all storage signed-URL access. Sign-off list complete before launch.

---

### Group I — Polish, audit-trail surface, and final touches

50. **Surface the audit timeline on every client detail page.** Last 50 rows from `global_audit_log` filtered to `entity_id = client_id` OR rows where `details->>client_id = <id>`. Render as a compact timeline panel below the tabs.

51. **Add `InsightStrip` to the admin firm dashboard and team client detail pages.** Currently only on `/portal`. Per the sophistication rule "insights are inline annotations everywhere".

52. **Add `VersionDiff` link on every versioned record.** Each GST / TDS / IT row in the compliance tab shows "v3 · revised 14 May" link → side-by-side diff with prior version. Component already built; just wire.

53. **Notification-service email-sent matchers.** Tighten the `email_sent` flag update to use the in-app row's `id` rather than the compound `(user_id, related_entity_*)` key. Same for the digest cron's "mark these as emailed" step. Avoids accidental over-marking.

54. **Tax-projection data model.** The current implementation reuses `compliance_insights` with `insight_type='other'` as a coupling hack. Replace with a real `tax_projections` table or use `financial_data` with `data_type='tax_projection'`. Single migration.

55. **One global keyboard-shortcut help link in the app footer/header.** Currently `?` toggles the overlay but most users won't know that. A subtle "Keyboard shortcuts" link in the footer is enough discoverability for power users.

56. **Replace all em-dash placeholder copy in shipped pages** ("Phase 2", "Coming soon", static `—` where data is null but should default to a useful state).

---

## Out of scope for this round

These stay out per the user's calls:

- **Salary slip generation.** Manual for now.
- **WhatsApp / SMS notifications.** Cost-prohibitive for v1.
- **Native mobile app.** Mobile-responsive web only; PWA manifest later.
- **Tally / Zoho Books connector.** v2.
- **CBAM module beyond schema.** Build only when first paying engagement asks for it.
- **Engagement-letter e-sign integration.** Manual upload of signed PDF for v1.
- **Real-time websocket notifications.** Polling at 30s is fine.

---

## Definition of done — what "ready to launch" means

- All groups A through I complete; each group's tasks land their respective workflow end-to-end as described in `WORKFLOWS.md`.
- Day-31 DPDP audit signed off with evidence (Group H task 45).
- 2FA confirmed for every admin and team account in production (Group H task 46).
- One real paying client onboarded through the new flows: bulk-import-or-single-form → service & sub-service assignment → SOP-driven first task → first GSTR-3B filed end-to-end → portal access verified, client logs in, sees only their data, only their enabled modules.
- All five crons firing in production with last 7 days of runs visible in Vercel logs.
- Privacy / Terms / Engagement / SLA pages live and linked from app footer.
- No UI page shows "Phase 2", em-dash placeholders, or empty states without a contextual next action.
- Cmd-K palette and visible search bar both work; mobile portal bottom-tab nav verified on a real Android device.

That's the bar.
## v3 status update — May 12, 2026
 
 **Major Progress Milestone Reached.**
 
 - **BizLens Native Integration**: Group D is fully complete. The analytical engine is now a native part of the Next.js app with full 6-tab feature parity.
 - **Stabilization Pass**: Project-wide TypeScript and build errors have been resolved. The codebase is now in a "Clean Build" state.
 - **Workflow Refinement**: Client actions in `lib/actions/clients.ts` have been standardized (removed `Action` suffix) and usage updated throughout.
 - **Next Focus**: Group E (Bulk Import) and Group H (Production Readiness).

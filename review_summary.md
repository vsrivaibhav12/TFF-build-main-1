# Fiscal Fulcrum Codebase & Architecture Review

## 1. High-Level Understanding & Philosophy
The Fiscal Fulcrum (TFF) is transitioning from a dual-stack (Flask backend + Next.js frontend) to a **Next.js-native (Path A) monolithic architecture**. The core philosophy centers on keeping the database (Supabase) as the source of truth, Next.js server functions for orchestration and business logic, and React components strictly for presentation.

Crucially, development is now driven by a **Workflow-First approach** (`WORKFLOWS.md`) instead of a structure-first approach. The UX draws heavy inspiration from Indian CA practice management tools like Jamku, Practive, and Turia. It aims for a "Sophistication Layer" that prioritizes data density, contextual insights, minimal clicks, and inline editing.

## 2. Architectural Blueprint
- **Framework:** Next.js 14 (App Router) with Tailwind CSS, shadcn/ui, and Lucide icons.
- **Backend & Auth:** Supabase (Auth, Postgres, Storage, RLS).
- **Communication Flow:**
  - **Reads:** Server Components directly fetching from `lib/repositories/`.
  - **Writes:** Server Actions (`lib/actions/`) that act as thin wrappers around business logic (`lib/services/`).
  - **Crons/Webhooks:** API Routes (`app/api/`) utilizing Vercel Cron and a service-role Supabase client to bypass RLS.
- **Security & DPDP Compliance:**
  - Strict Row-Level Security (RLS) is the primary data barrier.
  - A secondary **RBAC Capability Layer** (e.g., `requireCapability()`) provides fine-grained admin-level controls.
  - AES-256-GCM app-layer encryption for the credentials vault.
  - Granular, per-client portal visibility toggles ensure data minimization.

## 3. Current Codebase State (`TFF-build-main`)
The project structure aligns perfectly with the prescribed architecture:
- **Routing:** Divided cleanly into `(marketing)`, `(auth)`, `portal/` (clients), `team/` (staff), and `admin/` (firm management).
- **Logic Layers:** `lib/` is well-separated into `actions`, `services`, `repositories`, and `validation`. I can see dozens of files implemented (e.g., `tasks.ts`, `clients.ts`, `compliance-calendar.ts`), showing that Phase 0 and Phase 1 (foundations, auth, schema deployment, basic CRUD) are largely in place.
- **Database:** Defined via `schema.sql` (v3) and `schema-additions.sql` (v3.2), which removes hardcoded catalogues and adds tables for custom SOPs, roles, bulk imports, and portal visibility.

## 4. Review & Go-Forward Focus
The documentation and design constraints (`DESIGN_SYSTEM.md`, `GO_FORWARD_PLAN.md`) are exceptionally rigorous. My review of the go-forward plan highlights the following critical next steps:

### A. The "Simplification Debt" (Group A & B)
The most urgent task is undoing the "developer-centric" UI (wizards, complex multi-step forms) in favor of the "CA-centric" UI (single scrollable forms, smart defaults, bulk inline editing). Implementing the custom Service Catalogue and replacing hardcoded services is foundational for the rest of the workflow.

### B. BizLens Native Port (Group D)
This is the highest-risk technical item. Moving from a legacy iframe (`public/bizlens-app/`) to a native React staff-input form and a curated client-side read-only dashboard requires porting complex financial logic into `lib/services/bizlens-service.ts`. Writing exhaustive unit tests for these pure functions will be critical before wiring them to the UI.

### C. Task Checklist Workflows (Group C)
Transitioning tasks from simple status drops to SOP-driven checklists (`task_steps` with individual sign-offs) is a major UX win. It requires updating the cron generator and manual task creation logic to clone the `sub_service_sop_steps`.

### D. Security & Rollout
The mandatory DPDP 10-point audit and 2FA enforcement reflect a mature understanding of compliance.

## Summary
The plan is rock-solid. The architectural pivot to a single Next.js codebase drastically reduces deployment complexity and inter-service latency. The focus on workflow-driven UX will define the product's success. 

**I am fully synced with your design constraints, routing structures, and the v2 `GO_FORWARD_PLAN.md` tasks. Let me know which group or specific task you'd like to execute first!**

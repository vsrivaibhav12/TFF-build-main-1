# AGENTS.md — The Fiscal Fulcrum Portal

> This file is written for AI coding agents. It assumes you know nothing about the project. Read this first before modifying any code.

---

## Project Overview

**The Fiscal Fulcrum (TFF)** is a single-tenant operations portal for an Indian CA/CS practice. It is **not** a multi-tenant SaaS — it serves one firm and that firm's clients.

The portal supports three user roles:
- **admin** — firm owners; full access
- **team** — staff members; access scoped by client assignment + capability grants
- **client** — external business clients; access scoped to their own data + portal visibility settings

Key functional modules: client management, task engine, compliance tracking (GST/TDS/IT), document vault, credentials vault, DSC tracker, payroll, attendance/leave, vCFO advisory, BizLens financial intelligence, notice tracker, query messenger, and insight engine.

Production target: `https://portal.fiscalfulcrum.in` deployed on Vercel.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS 3 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Font | Inter (via `next/font/google`) |
| Backend / Auth / DB | Supabase (Postgres + Auth + Storage + RLS) |
| Validation | Zod |
| Forms | React Hook Form + `@hookform/resolvers` |
| Email | Resend |
| Charts | Recharts |
| Tables | `@tanstack/react-table` |
| Toast | Sonner |
| Test Runner | Node.js native test runner (`node:test`) |
| Dev Proxy | FastAPI (`backend/server.py`) + Node proxy (`proxy.js`) |

No ESLint or Prettier configuration files are present in the repo. `next lint` is available via `npm run lint`.

---

## Project Structure

```
/app                 # Next.js App Router
  /account           # Self-service pages (notifications prefs, etc.)
  /admin             # Admin panel (role-gated)
  /api               # API routes (cron, webhooks, search)
    /cron            # Vercel Cron endpoints
  /legal             # Static legal pages (privacy, terms)
  /login             # Sign-in page
  /portal            # Client portal (role-gated)
  /team              # Team workspace (role-gated)
  globals.css        # Tailwind directives + CSS variables
  layout.tsx         # Root layout (Inter font, Sonner Toaster)
  page.tsx           # Role-based redirect hub

/components          # React components by domain
  /bizlens           # BizLens output dashboard + tabs
  /insights          # Inline insight strips
  /operations        # Compliance calendar, BizLens input form
  /portal            # Client portal-specific components
  /shell             # AppShell, command palette, notifications bell
  /sophistication    # Saved views, bulk actions, audit timeline, etc.
  /tasks             # Task dialogs, steps panel, work-done panel
  /ui                # shadcn/ui primitives (Button, Card, Dialog, etc.)

/lib                 # All server-side logic lives here
  /actions           # Server Actions — thin wrappers over services
  /auth              # Auth helpers (requireRole, requireCapability, portal visibility)
  /crypto            # AES-256-GCM encrypt/decrypt for credentials vault
  /email             # Resend client and send helpers
  /repositories      # DB access only — no business logic
  /services          # Business logic — testable, no HTTP
  /supabase          # Supabase clients (server, service-role, middleware)
  /validation        # Zod schemas
  utils.ts           # cn() helper, INR currency formatter, IST date formatter

/db                  # SQL schema and migrations
  schema.sql           # Base schema v3 (locked)
  schema-additions.sql # v3.1 additive tables (capabilities, portal visibility, notification prefs)
  rls-additive.sql     # Row Level Security policies
  seed-compliance-rules.sql
  schema-bizlens.sql
  schema-v3-3.sql

/scripts             # TypeScript one-off scripts (seed, schema apply, migrations, RLS tests)

/backend             # FastAPI dev proxy (forwards /api/* from port 8001 -> 3000)
  server.py
  requirements.txt

/legacy-bizlens      # Old iframe-based BizLens (deprecated, paths vacant)

/memory              # Design docs and architecture decisions
  DESIGN_SYSTEM.md
  DPDP_AND_SECURITY.md
  NEXTJS_BACKEND_ARCHITECTURE.md
  GO_FORWARD_PLAN.md
  PRD.md
  MIGRATION_NOTE.md

/__tests__           # Unit tests (Node native test runner)
```

---

## Build & Development Commands

All commands run from the project root.

```bash
# Install dependencies
npm install

# Dev server (Next.js on port 3000, listens 0.0.0.0)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint

# Proxy for Emergent dev environment (port 8001 -> 3000)
npm run proxy

# Database scripts (all use tsx + dotenv)
npm run db:apply-schema              # Apply base schema
npm run db:apply-schema-additions    # Apply v3.1 additive schema
npm run db:seed                      # Seed demo data
npm run db:seed-rollback             # Remove seeded demo data
npm run db:rls-test                  # Run RLS tests
npm run db:create-buckets            # Create Supabase Storage buckets
```

### FastAPI dev proxy (alternative)
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

The FastAPI proxy is **dev-only**. Vercel handles production directly.

---

## Code Style & Conventions

### Three-Layer Architecture (non-negotiable)

1. **Actions** (`lib/actions/*.ts`) — Server Actions. Gate on `requireRole` + `requireCapability`, validate with Zod, call services, return `ActionResult`.
2. **Services** (`lib/services/*.ts`) — Business logic. Take typed inputs, return typed outputs. No HTTP, no `revalidatePath`.
3. **Repositories** (`lib/repositories/*.ts`) — DB access only. Just CRUD against Supabase. No logic.

**Rules:**
- Actions never touch the database directly.
- Services never touch HTTP.
- Repositories never contain logic.

### Server Action Pattern

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import * as someService from '@/lib/services/some-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function doSomething(input: SomeInput): Promise<ActionResult<SomeOutput>> {
  const me = await requireRole(['admin', 'team']);
  await requireCapability(me.id, 'some.capability');
  // validate, call service, revalidatePath, return ok/fail
}
```

### Standard Return Shape

Every Server Action returns one of:
```ts
{ success: true; data: T }
{ success: false; error: string; code?: string }
```

Use `ok(data)` and `fail(message, code)` from `lib/actions/result.ts`.

### Error Handling

- Services throw `ServiceError(message, code)`.
- Actions catch and convert to the standard result shape.
- Never leak raw exceptions to the frontend.

### File Naming

- Server Actions: `kebab-case.ts` (e.g., `compliance-calendar.ts`)
- Services: `kebab-case-service.ts`
- Repositories: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Pages: `page.tsx` or `[param]/page.tsx`
- API routes: `route.ts`

### Imports & Aliases

- Path alias `@/*` maps to `./*` (project root).
- Use `@/lib/...`, `@/components/...`, etc.

### React Patterns

- **Server Components** are the default. Use them for read-only page data.
- **Client Components** (`'use client'`) only when interactivity (state, effects, hooks) is needed.
- **Server Actions** (`'use server'`) for all writes triggered by UI.

### UI Conventions

- **Sentence case** everywhere: "Save changes", not "Save Changes".
- **No emojis** in UI strings.
- **No exclamation marks** in app copy (toasts are the exception, sparingly).
- **Active voice**: "Update task", not "Task will be updated".
- **shadcn/ui components** are the default for all primitives.
- **Cards**: `border border-zinc-200 rounded-xl`, no shadow by default.
- **Hover lift**: `hover:border-zinc-300 transition-colors`.
- **Drop shadows** allowed only on floating UI: modals, dropdowns, tooltips, command palette.

### Design System Quick Reference

```
Background:    white (#FFFFFF)
Surface:       zinc-50 (#FAFAFA)
Headings:      zinc-900 (#18181B)
Body text:     zinc-500 (#71717A)
Borders:       zinc-200 (#E4E4E7)
Accent:        teal-600 (#0D9488)
Accent hover:  teal-700 (#0F766E)
Success:       green-600 (#16A34A)
Warning:       yellow-600 (#CA8A04)
Error:         red-600 (#DC2626)
```

- Font: Inter only.
- Client portal: **mobile-first** (bottom-tab nav below 768px).
- Team / admin: **desktop-first** (side nav on desktop, hamburger on mobile).

---

## Authentication & Authorization

### Role Model

Three roles: `admin`, `team`, `client`.

- `admin` implicitly holds every capability.
- `team` holds **no capabilities by default**; admin grants explicitly.
- `client` is scoped entirely by RLS + portal visibility.

### Middleware (`middleware.ts`)

- Redirects logged-out users from `/portal`, `/team`, `/admin` to `/login`.
- Redirects logged-in users hitting `/login` to `/` (role-routed).
- Redirects users hitting a role-prefix that doesn't match their role to their home page.
- Neutral prefixes (`/account`, `/legal`, `/api/cmdk`, etc.) bypass role checks.

### Auth Helpers

- `requireRole(allowedRoles)` — throws/redirects if user lacks role.
- `requireCapability(userId, capability)` — throws `ServiceError('CAPABILITY_DENIED')` if user lacks capability.
- `getCurrentUser()` — returns `{ id, email, role, full_name, is_active }` or `null`.

### Portal Visibility

Per-client toggle of which modules appear in the client portal. Default on portal-enable: `dashboard + tasks + queries` only. Admin opens additional modules per engagement. Every `/portal/<module>` layout calls `ensureModuleVisible`; missing module → `notFound()`.

---

## Database & Supabase

### Clients

- **Server client** (`lib/supabase/server.ts`) — cookie-aware, respects RLS. Use in Server Components, Server Actions, Route Handlers.
- **Service-role client** (`lib/supabase/service-role.ts`) — **bypasses RLS**. Use ONLY in cron endpoints, webhooks, and one-off scripts. Never in browser. Never in user-initiated request paths.
- **Middleware client** (`lib/supabase/middleware.ts`) — session refresh in Next.js middleware.

### Row Level Security (RLS)

RLS is the **primary access-control boundary**. Every new table gets RLS policies before it gets data. The application layer adds capability gates as defense-in-depth, but RLS is the real lock.

### Schema

- Base schema: `db/schema.sql` v3 (locked, ~46 tables).
- Additive schema: `db/schema-additions.sql` v3.1 (capabilities, portal visibility, notification preferences).
- RLS policies: `db/rls-additive.sql`.

### Key Patterns

- **Soft delete**: `is_deleted`, `deleted_at`, `deleted_by` on client-data tables.
- **Versioning**: `is_current` + `superseded_by` for GST/TDS/IT filings and financial data.
- **Audit log**: `global_audit_log` captures actor, timestamp, action, entity for sensitive writes.
- **Partial unique index** on tasks prevents duplicate generation at DB level.

---

## Testing

### Unit Tests

The project uses the **Node.js native test runner** (`node:test`) with `assert`.

```bash
# Run all tests
node --test

# Run with tsx
npx tsx --test __tests__/bizlens-service.test.ts
```

Current test coverage:
- `__tests__/bizlens-service.test.ts` — BizLens math engine (12 tests covering contribution margin, break-even, working capital cycle, BizLens score, risk assessment, insight engine, AR ageing, opportunities, concentration risk, interest coverage).

### RLS / Security Tests

Run `npm run db:rls-test` for automated RLS verification. There are also 10 manual access-control tests defined in `memory/DPDP_AND_SECURITY.md` (Day-3 and Day-31 audit checklist).

### Adding Tests

When you add pure business logic in `lib/services/`, add corresponding tests in `__tests__/`. Mock repositories; test service behavior in isolation.

---

## Cron Jobs

Defined in `vercel.json`. All schedules are UTC.

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/generate-monthly-tasks` | `0 1 1 * *` | Create recurring tasks on 1st of month (~06:30 IST) |
| `/api/cron/due-alerts` | `30 3 * * *` | Daily task due-date email alerts (~09:00 IST) |
| `/api/cron/dsc-alerts` | `30 2 * * *` | Daily DSC expiry alerts (~08:00 IST) |
| `/api/cron/notification-digest` | `0 4 * * *` | Daily/weekly digest emails (~09:30 IST) |
| `/api/cron/generate-insights` | `30 16 * * 0` | Weekly insight generation (Sunday ~22:00 IST) |
| `/api/cron/refresh-compliance-events` | `0 1 * * *` | Refresh compliance calendar events |

Cron handlers:
- Must check `x-vercel-cron` header or `CRON_SECRET` query param.
- Must use `createServiceClient()` (no user session).
- Must set `maxDuration = 60` (Vercel Pro limit).

---

## Environment Variables

Required in `.env.local` (and Vercel production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # ⚠️ server only, never NEXT_PUBLIC_
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@thefiscalfulcrum.com

# Crypto
CREDENTIALS_KEY=<32+ char random string>  # AES-256-GCM key for credentials vault

# Cron
CRON_SECRET=<random string>               # Vercel Cron auth

# Seed
ADMIN_SEED_EMAIL=admin@example.com
```

**Critical rule**: Never prefix a secret with `NEXT_PUBLIC_`. That sends it to the browser.

---

## Security Considerations

1. **RLS first**: Every table has RLS policies. Do not disable RLS for testing.
2. **Capability gates**: Every Server Action gates on `requireRole` then `requireCapability`.
3. **Service-role key**: Only in cron/webhooks/scripts. Never in Client Components.
4. **Credentials vault**: AES-256-GCM encryption in application layer (not `pgcrypto`). Decrypt only in `credentials.manage`-gated actions.
5. **Audit log**: Every capability grant/revoke, portal visibility change, credential decrypt, soft-delete, and bulk action writes to `global_audit_log`.
6. **2FA**: Mandatory for `admin` and `team` in production Supabase.
7. **DPDP compliance**: See `memory/DPDP_AND_SECURITY.md` for the full 10-test audit checklist and breach-response guidance.

---

## Deployment

- **Production**: Vercel (linked to GitHub repo).
- **Domain**: `portal.fiscalfulcrum.in`.
- **Marketing site**: Separate repo at `fiscalfulcrum.in`.
- **Sign-out redirect**: Returns to `https://fiscalfulcrum.in/`.

---

## Where to Read More

- **Architecture deep-dive**: `memory/NEXTJS_BACKEND_ARCHITECTURE.md`
- **Design system + sophistication bar**: `memory/DESIGN_SYSTEM.md`
- **Security & DPDP**: `memory/DPDP_AND_SECURITY.md`
- **Active backlog**: `memory/GO_FORWARD_PLAN.md`
- **Schema**: `db/schema.sql` + `db/schema-additions.sql`
- **Historical reasoning**: `memory/PRD.md` + `BUILD_PLAN.md`

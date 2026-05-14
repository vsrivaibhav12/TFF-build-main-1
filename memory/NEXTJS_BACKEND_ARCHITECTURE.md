# THE FISCAL FULCRUM — BACKEND ARCHITECTURE (Next.js)

**Version:** v3 (Path A — Next.js-native)
**Status:** Locked. Build against this.
**Replaces:** The Flask backend bundle (deprecated — see `MIGRATION_NOTE.md`)

---

## Why Next.js (not Flask)

You have one developer, no coding background, and Emergent as your build agent. Adding a separate Flask backend means two deployments, two languages, and a network seam between your UI and your data — all overhead Emergent will struggle with.

Next.js already has a server. Supabase already has Auth, Storage, Postgres, and RLS. Vercel already has Cron. The "backend" you need is just a folder of server functions inside your Next.js app, calling Supabase. That's it.

This document defines how that's structured.

---

## Core principle (don't break this)

**Database = source of truth. Server functions = orchestration + logic. React components = presentation.**

The same rule that drove the Flask design still applies — only the location changes.

| Layer | Was (Flask) | Is now (Next.js) |
|---|---|---|
| HTTP entry | Flask routes | Server Actions + API Routes |
| Business logic | `services/*.py` | `lib/services/*.ts` |
| DB access | `repositories/*.py` | `lib/repositories/*.ts` |
| Cron | APScheduler in long-running Flask process | Vercel Cron hitting `/api/cron/*` |
| Auth | JWT verification middleware | Supabase SSR client + middleware |
| Email | Resend SDK | Resend SDK (unchanged) |

Same shape, fewer moving parts.

---

## When to use what

This is the one rule worth memorising. Pick the right entry point and the rest follows.

**Server Actions** — for everything the UI does directly.
- Creating a client, updating a task status, submitting a payroll run, posting a query reply, uploading a document record.
- Called from a React component as if it were a normal function. No URL, no fetch, no JSON serialisation.
- Default choice. If a user clicks a button to do a thing, it's a Server Action.

**API Routes (`app/api/.../route.ts`)** — for things that need a real URL.
- Vercel Cron endpoints (cron services hit URLs, not functions).
- Webhooks from Resend (delivery/bounce events) or any future external service.
- Anything called by something that isn't your own React UI.
- Future GSP API integrations, Tally connector callbacks, etc.

**Server Components (data fetching)** — for read-only page data.
- Listing clients on `/admin/clients`, showing a task on `/team/tasks/[id]`.
- Just `await` the repository call inside the component. No action, no route needed.

If you remember nothing else: **action for writes, server component for reads, API route only when something external calls in**.

---

## Project structure

```
/app
├── (marketing)/                  # Public pages: /, /about, /caas, /vcfo, /cbam
├── (auth)/
│   ├── login/page.tsx
│   └── auth/callback/route.ts    # Supabase OAuth callback
│
├── portal/                       # Client portal (role: client)
│   ├── layout.tsx                # Enforces role=client
│   ├── page.tsx                  # Dashboard
│   ├── tasks/
│   ├── documents/
│   ├── queries/
│   └── bizlens/
│
├── team/                         # Team workspace (role: team)
│   ├── layout.tsx                # Enforces role=team or admin
│   ├── clients/
│   ├── tasks/
│   ├── compliance/
│   ├── attendance/
│   └── payroll/
│
├── admin/                        # Admin panel (role: admin)
│   ├── layout.tsx
│   ├── clients/
│   ├── team/
│   ├── services/
│   └── audit/
│
└── api/
    ├── cron/
    │   ├── generate-tasks/route.ts      # Monthly, 1st @ 01:00 IST
    │   ├── due-alerts/route.ts          # Daily @ 09:00 IST
    │   ├── dsc-alerts/route.ts          # Daily @ 08:00 IST
    │   └── generate-insights/route.ts   # Weekly, Sun @ 22:00 IST
    └── webhooks/
        └── resend/route.ts              # Email delivery events

/lib
├── supabase/
│   ├── server.ts                 # Server-side Supabase client (cookies-aware)
│   ├── service-role.ts           # Service-role client (cron only, bypasses RLS)
│   └── middleware.ts             # Refresh session in middleware
│
├── auth/
│   ├── require-role.ts           # Throws if user doesn't have required role
│   └── current-user.ts           # Returns { id, role, profile } or null
│
├── repositories/                 # DB access only — no business logic
│   ├── clients.ts
│   ├── tasks.ts
│   ├── compliance.ts
│   ├── financials.ts
│   ├── payroll.ts
│   ├── credentials.ts
│   └── notifications.ts
│
├── services/                     # Business logic — testable, no DB calls except via repos
│   ├── task-service.ts           # createTask, updateStatus, generateMonthly
│   ├── compliance-service.ts     # versioning logic for GST/TDS/IT
│   ├── payroll-service.ts        # calculatePayroll (pure function)
│   ├── insight-service.ts        # ITC gap, effective rate, etc.
│   └── notification-service.ts   # email + in-app dispatch
│
├── actions/                      # Server Actions — thin wrappers over services
│   ├── clients.ts
│   ├── tasks.ts
│   ├── compliance.ts
│   ├── payroll.ts
│   └── queries.ts
│
├── crypto/
│   └── credentials.ts            # AES-256-GCM encrypt/decrypt for vault
│
└── email/
    └── resend.ts                 # Resend client + send helpers

/middleware.ts                    # Next.js middleware for session refresh
/next.config.js
/vercel.json                      # Cron schedule
```

Three rules. No exceptions.
- **Actions never touch the database directly.** They call services.
- **Services never touch HTTP.** They take typed inputs, return typed outputs.
- **Repositories never contain logic.** Just CRUD against Supabase.

---

## Authentication

Supabase Auth issues the JWT. Next.js validates it via the SSR helper. RLS does the actual access control.

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(c => cookieStore.set(c.name, c.value, c.options)),
      },
    }
  );
}
```

```ts
// lib/auth/require-role.ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireRole(roles: ('admin' | 'team' | 'client')[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !roles.includes(profile.role)) {
    redirect('/login?error=forbidden');
  }
  return { user, profile };
}
```

Used in route layouts:
```ts
// app/team/layout.tsx
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['team', 'admin']);
  return <>{children}</>;
}
```

**Trust RLS for data isolation. Don't reimplement access control in application code.** If a team member somehow hits a query for a client they're not assigned to, RLS returns zero rows — no error needed.

---

## Server Actions — the pattern

Every write goes through this shape. Memorise it once.

```ts
// lib/actions/tasks.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import * as taskService from '@/lib/services/task-service';

const UpdateStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['pending', 'awaiting_client', 'in_progress', 'review', 'completed']),
  comment: z.string().max(500).optional(),
});

export async function updateTaskStatus(input: z.infer<typeof UpdateStatusSchema>) {
  const { user } = await requireRole(['team', 'admin', 'client']);
  const data = UpdateStatusSchema.parse(input);

  try {
    const task = await taskService.updateStatus({
      taskId: data.taskId,
      newStatus: data.status,
      changedBy: user.id,
      comment: data.comment,
    });
    revalidatePath('/team/tasks');
    revalidatePath('/portal/tasks');
    return { success: true, data: task };
  } catch (err) {
    return { success: false, error: errorMessage(err), code: errorCode(err) };
  }
}
```

Called from a component:
```tsx
'use client';
import { updateTaskStatus } from '@/lib/actions/tasks';

function StatusButton({ taskId }: { taskId: string }) {
  return <button onClick={async () => {
    const result = await updateTaskStatus({ taskId, status: 'completed' });
    if (!result.success) toast.error(result.error);
  }}>Mark complete</button>;
}
```

Three things to notice:
- **Zod validation at the boundary.** Inputs are untrusted until parsed.
- **Standardised return shape.** `{ success, data }` or `{ success, error, code }`. Same for every action. Frontend gets one error-handling pattern.
- **`revalidatePath`.** Tells Next.js to refresh the data on these pages. No manual cache management.

---

## Services — where the logic lives

A service function takes inputs, calls one or more repositories, applies business rules, returns a result. **No HTTP, no auth, no `revalidatePath`** — those belong to the action wrapping it.

```ts
// lib/services/task-service.ts
import * as taskRepo from '@/lib/repositories/tasks';
import * as notificationService from './notification-service';

export async function updateStatus({
  taskId, newStatus, changedBy, comment,
}: UpdateStatusInput) {
  const task = await taskRepo.getById(taskId);
  if (!task) throw new ServiceError('TASK_NOT_FOUND', 'Task not found');

  const oldStatus = task.status;
  if (!isValidTransition(oldStatus, newStatus)) {
    throw new ServiceError('INVALID_TRANSITION',
      `Cannot move from ${oldStatus} to ${newStatus}`);
  }

  const updated = await taskRepo.update(taskId, {
    status: newStatus,
    ...(newStatus === 'completed' && { completed_date: new Date() }),
  });

  await taskRepo.logActivity({
    task_id: taskId,
    field_changed: 'status',
    old_value: oldStatus,
    new_value: newStatus,
    changed_by: changedBy,
    comment,
  });

  if (newStatus === 'awaiting_client') {
    await notificationService.notifyClient(task.client_id, 'task_awaiting', { task });
  }

  return updated;
}
```

This function is testable in isolation. Mock the repositories, assert the service does the right thing.

---

## Repositories — boring and predictable

```ts
// lib/repositories/tasks.ts
import { createClient } from '@/lib/supabase/server';

export async function getById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*, client:clients(*), sub_service:sub_services(*)')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function update(id: string, patch: Partial<TaskUpdate>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

Repositories are the only place Supabase is imported. If you later swap Supabase for something else (you won't, but hypothetically), this is the only layer that changes.

---

## Cron jobs (Vercel Cron)

Vercel Cron hits an HTTP endpoint on a schedule. The endpoint does the work.

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/generate-tasks",     "schedule": "0 1 1 * *" },
    { "path": "/api/cron/due-alerts",         "schedule": "30 3 * * *" },
    { "path": "/api/cron/dsc-alerts",         "schedule": "30 2 * * *" },
    { "path": "/api/cron/generate-insights",  "schedule": "30 16 * * 0" }
  ]
}
```

Cron schedules are **UTC**. The times above translate to:
- Task generation: 1st of every month at 06:30 IST
- Due alerts: 09:00 IST daily
- DSC alerts: 08:00 IST daily
- Insights: Sunday 22:00 IST

```ts
// app/api/cron/generate-tasks/route.ts
import { NextResponse } from 'next/server';
import { generateMonthlyTasks } from '@/lib/services/task-service';

export const maxDuration = 60; // seconds — Vercel Pro limit

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    const result = await generateMonthlyTasks();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[cron] generate-tasks failed', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

Three things that matter for cron:
1. **The auth header check is non-negotiable.** Without it, anyone can hit `/api/cron/generate-tasks` and trigger task creation. Vercel sets the header automatically when *Vercel Cron* hits the endpoint.
2. **`maxDuration = 60`.** Vercel Pro caps function duration at 60s. Hobby is 10s. Once you hit ~50 clients, monthly generation may exceed 60s — at that point, switch to a queue (Inngest, Trigger.dev) or batch via multiple cron runs. Not your problem for v1.
3. **The cron handler must use the service-role Supabase client**, because there's no logged-in user — RLS would return zero rows otherwise.

```ts
// lib/supabase/service-role.ts
// USE ONLY in cron endpoints and webhooks. Bypasses RLS.
import { createClient } from '@supabase/supabase-js';

export const serviceClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ⚠️ never expose to browser
  { auth: { persistSession: false } }
);
```

The service-role key bypasses RLS. Treat it like a master password — only use it server-side, only in code paths where you've verified the request came from Vercel Cron or a trusted webhook.

---

## Task generation — the actual logic

```ts
// lib/services/task-service.ts (continued)
import { serviceClient } from '@/lib/supabase/service-role';

export async function generateMonthlyTasks() {
  const sb = serviceClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let created = 0, skipped = 0, errored = 0;

  const { data: subscriptions } = await sb
    .from('client_sub_services')
    .select(`
      client_id,
      sub_service_id,
      sub_services!inner(name, frequency, due_day_of_month)
    `)
    .eq('is_active', true)
    .eq('sub_services.frequency', 'monthly');

  for (const sub of subscriptions ?? []) {
    try {
      // First line of defence: app-level check
      const { data: existing } = await sb
        .from('tasks')
        .select('id')
        .eq('client_id', sub.client_id)
        .eq('sub_service_id', sub.sub_service_id)
        .eq('period_month', month)
        .eq('period_year', year)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const dueDate = computeDueDate(sub.sub_services.due_day_of_month, month, year);

      // Second line of defence: DB partial unique index will reject duplicates
      // even if the check above raced
      const { error } = await sb.from('tasks').insert({
        client_id: sub.client_id,
        sub_service_id: sub.sub_service_id,
        title: sub.sub_services.name,
        due_date: dueDate,
        period_month: month,
        period_year: year,
        status: 'pending',
        is_recurring: true,
      });

      if (error?.code === '23505') { skipped++; continue; } // unique violation = ok
      if (error) throw error;
      created++;
    } catch (err) {
      errored++;
      console.error('[task-gen] failed for', sub, err);
    }
  }

  return { created, skipped, errored, month, year };
}
```

Application check + DB partial unique index = belt and braces. Either alone has gaps; together they're solid.

---

## Payroll — pure function, no I/O

This is the canonical example of "logic in app, facts in DB." The calculation is a pure TypeScript function. Trivial to test.

```ts
// lib/services/payroll-service.ts

export interface PayrollFacts {
  base_salary: number;
  total_working_days: number;
  actual_present_days: number;
  paid_leaves_per_month: number;
  reimbursements: number;
  one_off_deductions: number;
}

export interface PayrollResult {
  daily_rate: number;
  salary_for_present_days: number;
  unpaid_leave_days: number;
  deduction_for_excess_leaves: number;
  gross_salary: number;
  estimated_tds: number;
  final_salary: number;
}

export function calculatePayroll(facts: PayrollFacts): PayrollResult {
  const daily_rate = facts.base_salary / facts.total_working_days;
  const salary_for_present_days = facts.actual_present_days * daily_rate;

  const unpaid_leave_days = Math.max(0,
    facts.total_working_days - facts.actual_present_days - facts.paid_leaves_per_month
  );
  const deduction_for_excess_leaves = unpaid_leave_days * daily_rate;

  const gross_salary =
    salary_for_present_days
    - deduction_for_excess_leaves
    + facts.reimbursements
    - facts.one_off_deductions;

  const estimated_tds = estimateTDS(gross_salary);
  const final_salary = gross_salary - estimated_tds;

  return {
    daily_rate, salary_for_present_days, unpaid_leave_days,
    deduction_for_excess_leaves, gross_salary, estimated_tds, final_salary,
  };
}

function estimateTDS(gross: number): number {
  // Simplified flat slab; replace with real slab logic later
  if (gross <= 25_000) return 0;
  if (gross <= 50_000) return gross * 0.05;
  return gross * 0.10;
}
```

The action that uses it stores both the facts and the calculated values:

```ts
// lib/actions/payroll.ts
'use server';
import { calculatePayroll } from '@/lib/services/payroll-service';
import * as payrollRepo from '@/lib/repositories/payroll';

export async function runPayroll(input: { user_id: string; month: number; year: number }) {
  const { user } = await requireRole(['admin']);
  const facts = await payrollRepo.getFactsForPeriod(input);
  const calc = calculatePayroll(facts);

  const run = await payrollRepo.upsertRun({
    ...input,
    ...facts,
    ...calc,
    run_by: user.id,
  });
  return { success: true, data: run };
}
```

---

## Compliance versioning

When a GST filing is updated, mark the old row stale, insert the new one, link them. This is the same pattern as the Flask version — only the language changes.

```ts
// lib/services/compliance-service.ts
export async function upsertGstFiling(input: GstFilingInput, userId: string) {
  return await complianceRepo.transaction(async (tx) => {
    const existing = await tx.getCurrentFiling(input.client_id, input.period_month, input.period_year);

    if (existing) {
      await tx.markNotCurrent(existing.id);
    }

    const inserted = await tx.insertFiling({
      ...input,
      is_current: true,
      superseded_by: null,
      created_by: userId,
    });

    if (existing) {
      await tx.linkSupersession(existing.id, inserted.id);
    }
    return inserted;
  });
}
```

---

## Credentials vault — encryption

The schema stores encrypted passwords. Encryption happens **in the application**, not in `pgcrypto`. Reason: `pgcrypto` is bypassable by anyone with database admin access; app-layer encryption with a key in environment variables is not.

```ts
// lib/crypto/credentials.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = scryptSync(process.env.CREDENTIALS_KEY!, 'tff-vault-v1', 32);

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv (12) | tag (16) | ciphertext, base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
```

`CREDENTIALS_KEY` is a 32+ character random string in environment variables. **Never check it into git. Never expose it to the browser. Lose this key, and the vault is unrecoverable** — that's the point.

Decryption only happens in the credentials service, called only by team/admin actions. Client-role users can't even reach the action.

---

## Notifications

Two channels: in-app (rows in `notifications` table) and email (Resend). Both go through one service.

```ts
// lib/services/notification-service.ts
import { resend } from '@/lib/email/resend';
import * as notifRepo from '@/lib/repositories/notifications';

export async function notify({
  userId, type, title, body, email, emailSubject, emailHtml,
}: NotifyInput) {
  // In-app first (always succeeds or throws clearly)
  await notifRepo.insert({
    user_id: userId, type, title, body, is_read: false,
  });

  // Email best-effort with retry, fall back silently to in-app only
  if (email) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await resend.emails.send({
          from: 'TFF <noreply@thefiscalfulcrum.com>',
          to: email, subject: emailSubject!, html: emailHtml!,
        });
        return;
      } catch (err) {
        if (attempt === 2) {
          console.error('[email] gave up after 3 attempts', { userId, type, err });
          await notifRepo.logEmailFailure({ userId, type, error: String(err) });
        } else {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
  }
}
```

Email failures don't break the user-facing action. Worst case the user gets the in-app notification and no email; they're not blocked.

---

## Error handling — one shape

Every server action returns:
```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };
```

Services throw `ServiceError(code, message)`. Actions catch and convert to the result shape. Frontend always gets the same shape, regardless of what went wrong.

```ts
// lib/services/errors.ts
export class ServiceError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

// in actions:
try {
  const data = await someService.doThing(input);
  return { success: true, data };
} catch (err) {
  if (err instanceof ServiceError) {
    return { success: false, error: err.message, code: err.code };
  }
  if (err instanceof z.ZodError) {
    return { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' };
  }
  console.error('[action] unexpected', err);
  return { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' };
}
```

---

## Logging

For v1, `console.log` / `console.error`. Vercel captures function logs and you can grep them in the dashboard. When you've outgrown that (probably month 3+), add a log drain to a service — Logtail, Axiom, Better Stack.

Log everything that could matter in a post-mortem:
- Cron run start/end with counts
- Auth failures
- Email send failures
- Service errors (with the `code`)
- Anything caught and swallowed

Don't log: passwords, decrypted credentials, full JWT tokens, full document contents.

---

## Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # ⚠️ server only, never NEXT_PUBLIC_

# Email
RESEND_API_KEY=re_...

# Crypto
CREDENTIALS_KEY=<32+ char random string>    # generate once, never rotate without re-encrypting

# Cron
CRON_SECRET=<random string>                 # Vercel sets this for Cron auth header
```

The single biggest mistake here: prefixing a secret with `NEXT_PUBLIC_`. That sends it to the browser. Read every env var name twice before deploying.

---

## What's deliberately out of scope for v1

These belong in v2 / month 2+. Don't build them yet.

- **WebSockets / real-time notifications.** Polling every 30s is fine.
- **Background queues (Inngest, Trigger.dev).** Vercel Cron suffices below ~50 clients.
- **A staging environment.** Use a separate Supabase project for development; production uses preview deploys.
- **Sentry / error tracking.** `console.error` is enough until you have paying clients.
- **Materialized views for BizLens.** Compute on-demand. Add caching when it actually gets slow.
- **A separate Python service for PDF/Excel.** When you need it, add a single small service. Don't pre-build it.

---

## Mapping from the old Flask checklist

If you find yourself in an old document referencing Flask phases, here's the translation:

| Flask phase | Next.js equivalent | Effort change |
|---|---|---|
| Phase 0 — Setup | `npx create-next-app` + Supabase keys + Vercel link | -2 days |
| Phase 1 — Auth | Supabase SSR helpers + `requireRole` | -2 days |
| Phase 2 — Clients | Server Actions + repository | same |
| Phase 3 — Services | Server Actions + repository | same |
| Phase 4 — Tasks | Server Actions + repository + activity log | same |
| Phase 5 — Cron task gen | Vercel Cron + service function | -1 day |
| Phase 6 — Compliance | Server Actions + versioning service | same |
| Phase 7 — Financials | Repositories + read-only views | same |
| Phase 8 — Payroll | Pure function + Server Action | -1 day |
| Phase 9 — Insights | Service functions + read views | same |
| Phase 10 — Notifications | Notification service + Resend | same |
| Phase 11 — Queries | Server Actions + repository | same |
| Phase 12 — Documents/Credentials | Supabase Storage + crypto helper | same |
| Phase 13 — Testing | Vitest + Playwright | same |
| Phase 14 — Deployment | `git push` to Vercel-linked branch | -3 days |
| Phase 15 — Frontend integration | **Already integrated** (same codebase) | -10 days |

Net effect: ~20 days off the 45-day Flask plan. Realistic 30-day plan now actually fits in 30 days.

The day-by-day version of this is in `BUILD_PLAN.md`.

---

## What hasn't changed

- Schema is the same (v3 has one tiny addition for duplicate task prevention).
- RLS policies are the same.
- Versioning pattern, soft-delete pattern, audit log shape — all the same.
- The principle that DB stores facts and application owns logic — unchanged.
- The cron schedule and job semantics — unchanged.
- The notification, email, payroll, compliance, insight workflows — unchanged.

The substance was right. Only the runtime is different.

---

## v3.1 amendment — May 8, 2026

Three new server-side concepts that didn't exist in v3: the **capability layer**, the **portal visibility resolver**, and the **notification service**. Plus the **marketing-site integration** contract. All four are mandatory; every new feature uses all four where applicable.

Schema for the new tables is in `schema-additions.sql` (additive only — `schema.sql` v3 is unchanged on disk).

### Capability layer

```sql
-- in schema-additions.sql
CREATE TABLE staff_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID NOT NULL REFERENCES users_profile(id),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users_profile(id),
  UNIQUE(user_id, capability)
);
```

**Closed capability list (v1):**

```
clients.read.all          clients.create        clients.edit         clients.delete
clients.assign_team       clients.toggle_portal services.manage      services.assign
staff.manage              staff.grant_capabilities
dsc.manage                credentials.manage
tasks.assign              tasks.complete
compliance.enter          notices.manage
bizlens.enter             vcfo.enter
payroll.run
attendance.approve        leave.approve
documents.upload          documents.delete
queries.assign
audit.view                firm_dashboard.view   insights.configure
```

`admin` role implicitly holds every capability. `team` role holds none by default; admin grants explicitly via `/admin/team/[id]/capabilities`. Adding a new capability requires a journal entry.

**Helper:**

```ts
// lib/auth/require-capability.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/actions/result';

export async function hasCapability(userId: string, capability: string): Promise<boolean> {
  const sb = createClient();
  const { data: profile } = await sb
    .from('users_profile').select('role').eq('id', userId).single();
  if (profile?.role === 'admin') return true;
  const { data } = await sb
    .from('staff_capabilities')
    .select('id')
    .eq('user_id', userId)
    .eq('capability', capability)
    .is('revoked_at', null)
    .maybeSingle();
  return !!data;
}

export async function requireCapability(userId: string, capability: string) {
  if (!(await hasCapability(userId, capability))) {
    throw new ServiceError('Not permitted', 'CAPABILITY_DENIED');
  }
}
```

**Every Server Action gates on it after `requireRole`:**

```ts
const me = await requireRole(['admin', 'team']);
await requireCapability(me.id, 'compliance.enter');
// ... do work
```

Granting and revoking happen via `lib/actions/capabilities.ts`, gated on `staff.grant_capabilities` (admin-only by default). Both write to `global_audit_log`.

### Portal visibility resolver

```sql
CREATE TABLE client_portal_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),
  UNIQUE(client_id, module_key)
);
```

**Closed module list (v1):**

```
portal.dashboard            (always available if portal_enabled)
portal.tasks
portal.documents
portal.queries
portal.bizlens
portal.vcfo
portal.compliance_calendar
portal.insights
portal.tax_projection
portal.notices
portal.vendors
```

**Default on portal-enable:** `dashboard + tasks + queries` only. Admin opens additional modules explicitly per engagement, via `/admin/clients/[id]/portal`.

**Resolver:**

```ts
// lib/auth/portal-visibility.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function visibleModules(clientId: string): Promise<Set<string>> {
  const sb = createClient();
  const { data } = await sb
    .from('client_portal_visibility')
    .select('module_key, is_enabled')
    .eq('client_id', clientId);
  return new Set((data ?? []).filter((r) => r.is_enabled).map((r) => r.module_key));
}

export async function ensureModuleVisible(clientId: string, moduleKey: string) {
  const set = await visibleModules(clientId);
  if (!set.has(moduleKey)) {
    // Use notFound() in route layouts to avoid leaking module existence
    return false;
  }
  return true;
}
```

Every `/portal/<module>` route layout calls `ensureModuleVisible` against the user's resolved `client_id`; if false, the layout calls `notFound()`. The portal `AppShell` filters its nav items with the same set so disabled modules never appear in the sidebar.

### Notification service

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users_profile(id) ON DELETE CASCADE,
  email_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'off')),
  in_app_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Service:**

```ts
// lib/services/notification-service.ts
import 'server-only';
import { createServiceClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/resend';

export interface NotifyInput {
  userId: string;
  type: string;        // matches notifications.notification_type CHECK
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  email?: { subject: string; html: string };
}

export async function notify(input: NotifyInput) {
  const sb = createServiceClient();

  // 1. Always write in-app row
  await sb.from('notifications').insert({
    user_id: input.userId,
    notification_type: input.type,
    title: input.title,
    message: input.message,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
  });

  if (!input.email) return;

  const { data: prefs } = await sb
    .from('notification_preferences')
    .select('email_frequency')
    .eq('user_id', input.userId)
    .maybeSingle();
  const freq = prefs?.email_frequency ?? 'daily';

  // Daily/weekly digesting handled by /api/cron/notification-digest, not here
  if (freq !== 'immediate') return;

  const { data: profile } = await sb
    .from('users_profile').select('email').eq('id', input.userId).single();
  if (!profile?.email) return;

  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await sendEmail({ to: profile.email, ...input.email });
    if (r.ok) return;
    await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
  }
  console.error('[notify] email failed after 3 attempts', input);
}
```

Every meaningful Server Action calls `notify(...)` on the relevant user. The bell in `AppShell` polls `/api/notifications/unread` every 30 seconds. Daily and weekly digests are sent by `/api/cron/notification-digest`.

### Marketing-site integration

`fiscalfulcrum.in` (marketing) stays untouched in this codebase. The integration is a one-time edit on the marketing side plus visual matching:

- Top-right nav and footer: "Sign in" → `https://portal.fiscalfulcrum.in/login`
- Login page Inter weights and teal (`#0D9488`) must visually match the marketing site exactly.
- Portal `AppShell` signout redirects to `https://fiscalfulcrum.in/` (marketing home), not back to `/login`.
- A future "Request portal access" form on the marketing site lands as a row in a `leads` table (out of scope v1; placeholder noted).

### Updated `vercel.json` cron schedule

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

UTC; IST = UTC + 5:30. Translation: monthly tasks 1st @ 06:30 IST, DSC alerts 08:00 IST daily, due alerts 09:00 IST daily, notification digest 09:30 IST daily, insights Sunday 22:00 IST.

### Action layering reminder (v3.1 sharpened)

The three rules from v3 are sharpened by the capability layer:

1. **Actions never touch the database directly.** They call services. Repositories stay pure CRUD. (Several Phase 1 actions broke this rule for speed — Phase 2 features must follow it.)
2. **Services never touch HTTP.** They take typed inputs, return typed outputs.
3. **Repositories never contain logic.** Just CRUD against Supabase.
4. **Every Server Action runs `requireRole` then `requireCapability` before any work.** New rule. Non-negotiable.

# THE FISCAL FULCRUM — DESIGN SYSTEM REFERENCE

**Version:** v1 (locked)
**Status:** Final. Do not deviate.
**Use:** Paste this entire document into every Emergent prompt that touches UI.

---

## Why this document exists

"Notion/Linear aesthetic" means nothing to an AI builder without specifics. This document gives Emergent the specifics. Consistency is 80% of the Linear feel — and consistency comes from pasting this into every prompt, every time.

---

## Stack & libraries

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (this is what gives the Linear/Notion look out of the box)
- **Icons:** Lucide (ships with shadcn)
- **Font:** Inter, loaded via `next/font/google`. No other typeface anywhere.

---

## Color palette (locked)

```
Background:        #FFFFFF (white)
Surface:           #FAFAFA (zinc-50) — for subtle section alternation
Headings / text:   #18181B (zinc-900)
Body text:         #71717A (zinc-500)
Borders:           #E4E4E7 (zinc-200)
Disabled / hint:   #A1A1AA (zinc-400)

Accent (primary):  #0D9488 (deep teal — teal-600 in Tailwind)
Accent hover:      #0F766E (teal-700)
Accent light:      #CCFBF1 (teal-100, for tinted backgrounds)

Status (use sparingly):
  Success:         #16A34A (green-600)
  Warning:         #CA8A04 (yellow-600)
  Error:           #DC2626 (red-600)
```

The accent color (teal `#0D9488`) should appear on the page in **at least 15–20 places** — left borders on quotes, hover states, link underlines, percentage numbers, accent lines between sections, status pills, focus rings. Not just buttons. A page that uses teal only on the primary CTA looks 95% gray and feels dead.

---

## Typography

- **All Inter, all the time.**
- **H1:** 56–64px bold, letter-spacing tight (`tracking-tight`)
- **H2:** 36–40px semibold
- **H3:** 24–28px semibold
- **Body:** 16–18px, line-height 1.6–1.7
- **Small / caption:** 14px, zinc-500
- **Massive contrast** between heading sizes and body. This is what creates visual hierarchy.

---

## Spacing & layout

- **Generous.** Notion's whole feel comes from breathing room.
- Section vertical padding: **96–120px** (`py-24` to `py-32`).
- Container max-width: `max-w-6xl` for marketing, `max-w-7xl` for app dashboards.
- Card padding: `p-6` minimum, `p-8` for hero cards.
- Form field spacing: `space-y-4` between fields, `space-y-6` between groups.

---

## Borders & elevation

- **1px zinc-200 borders, almost no drop shadows.** This is the single most important visual rule.
- Cards: `border border-zinc-200 rounded-xl` — no shadow by default.
- Hover lift: `hover:border-zinc-300 transition-colors` — subtle, not dramatic.
- Drop shadows allowed only on: floating UI (modals, dropdowns, tooltips, command palette). Use `shadow-md` or `shadow-lg`, never `shadow-2xl`.

---

## What is forbidden

- ❌ No emojis in UI
- ❌ No gradients (subtle radial gradients on hero are the only exception, and only on marketing pages)
- ❌ No `rounded-3xl` "bubble" vibes — use `rounded-lg` or `rounded-xl`
- ❌ No drop shadows on cards or sections
- ❌ No more than one accent color
- ❌ No mixing of icon sets (Lucide only)
- ❌ No multiple fonts (Inter only)
- ❌ No light blue, navy blue, or indigo accents (the brand color is teal — don't let Emergent drift)

---

## Responsiveness

The portal and the team workspace have **different priorities**. Be explicit with Emergent every time.

**Client portal** (`/portal/*`):
- Mobile-first. Designed for a phone. Scales up cleanly to desktop.
- Bottom-tab navigation on mobile.
- Single-column layouts, full-width cards, generous tap targets (44px minimum).

**Team workspace** (`/team/*`) and **admin** (`/admin/*`):
- Desktop-first. Designed for a laptop. Gracefully degrades on tablet.
- Side navigation on desktop, hamburger drawer on mobile.
- Multi-column layouts, data tables, denser information.

---

## Components — defaults

When prompting Emergent, name shadcn components explicitly. Defaults that should always apply:

- **Buttons:** `Button` from shadcn. Primary = filled teal. Secondary = outline. Ghost = text-only.
- **Inputs:** `Input` from shadcn. Always with a `Label`. Focus ring in teal.
- **Tables:** `DataTable` pattern from shadcn (built on `@tanstack/react-table`).
- **Forms:** `react-hook-form` + `zod` resolver. shadcn `Form`, `FormField`, `FormItem`, `FormMessage`.
- **Modals / dialogs:** shadcn `Dialog`. Backdrop should be `bg-black/40`, never solid.
- **Toasts:** shadcn `Sonner` (the newer toast). Position: bottom-right.
- **Loading states:** shadcn `Skeleton` for content; `Spinner` only for inline button states.
- **Empty states:** Always provide one. Centered icon (Lucide), one-line heading, one-line description, one CTA.

---

## Tone & copy guidelines

- **Sentence case, not Title Case.** Buttons: "Save changes", not "Save Changes".
- **Active voice.** "Update task", not "Task will be updated".
- **No exclamation marks** in UI copy (toasts can have one for celebrations — sparingly).
- **No marketing speak** in app UI. Reserve persuasive language for the marketing site.
- **No emojis** anywhere in UI strings.

---

## Logo (interim)

For v1 launch, use a **text-only wordmark**: "The Fiscal Fulcrum" set in Inter Bold, in teal `#0D9488`, at 18px in nav bars. Logomark refresh is Month 2–3 work; do not block launch on it.

---

## The one paragraph version (for short prompts)

> **Design system: white background, Inter font everywhere, neutral zinc palette (zinc-900 headings, zinc-500 body, zinc-200 borders) with deep teal #0D9488 as the single accent color. shadcn/ui components, Lucide icons. Generous whitespace, 1px borders not shadows, no gradients, no emojis, no rounded-3xl. Notion/Linear aesthetic — restrained, professional, structured. Client portal is mobile-first; team and admin areas are desktop-first.**

Use this paragraph when you don't have room to paste the full document.

---

## Sophistication Layer — May 8, 2026

Phase 1 shipped a structurally correct but visually elementary portal. v1 launch must clear the bar below. Every screen, every role, every time. These are testable rules — if a feature ships that doesn't clear them, it doesn't ship.

### Density and information design

- **Every metric card carries context.** Either a sparkline (last 6 periods), a delta vs prior period (`+12% MoM`), or a status pill (`overdue` / `on track` / `at risk`). Never just a number.
- **Every number is drillable.** Click a metric → list view filtered to the rows that compose it.
- **Status pills carry severity colour.** green (success / on track), teal (in progress / informational), amber (warning / awaiting), red (overdue / error). Reserved palette — no other colours.
- **Heatmap on the admin firm dashboard.** Compliance health per client × last 6 months, click any cell to drill in.
- **Tabular numerals (`tabular-nums`) on every quantitative display.** Already correct on workspace counters; must be consistent everywhere.

### Smart empty states (mandatory)

Every empty state ships with a contextual next-action. No "No data yet." copy. Examples that are acceptable:

- "No tasks visible — your first GSTR-3B for [client] is due in 14 days. We're already on it; you'll see it move to *awaiting you* around the 15th."
- "No documents yet — uploads from us appear here. Your accountant will request the first one when the GSTR-1 cycle starts."
- "No queries — raise one any time and we'll respond within one business day."
- "No insights yet — we need at least 3 months of GST data to compute ITC utilisation. We'll surface insights starting [date]."

### Sophisticated patterns (mandatory across the build)

- **Command palette.** Cmd-K (or `/`) opens fuzzy search across every client, task, query, notice, document, setting. Accessible from every page on every role.
- **Inline insights, not a tab.** Insight Engine outputs annotate the rows they refer to (ITC pill on each GST filing row, timeliness chip on the client header) and surface as a "What we noticed" card on dashboards. There is no separate `/insights` page.
- **Bulk actions.** Every list with more than 10 rows supports multi-select and a bulk action menu (assign, change status, archive, export).
- **Saved views.** Named filter+sort presets per user, persisted server-side. Show as chips above the list.
- **Versioning UX.** Every versioned record (GST/TDS/IT filings, financial data) shows a "v3 · revised 14 May" link that opens a side-by-side diff with the prior version.
- **Audit trail surfaced.** Admin opens any client and sees the last 50 changes — task transitions, data entries, capability grants, portal visibility edits — in a single timeline panel on the client detail page.
- **View-as-client.** Admin gets a "View as [client name]" toggle on any client detail page. Renders the portal as that client sees it, read-only, with a "Viewing as [name]" banner.
- **Notifications bell.** In-app bell on every layout, polled every 30s. Each notification is a row in `notifications` written by every action that matters. Per-user digest preferences (immediate / daily / weekly / off) at `/account/notifications`.
- **Forgiving forms.** Auto-uppercase PAN/GSTIN. Derive state from GSTIN's first two digits. Auto-suggest sub-services from client category + turnover. Save form drafts on tab-close (`localStorage` not allowed in artifacts but fine for actual app).
- **Onboarding wizard.** Client creation collapses the four-tab profile → services → team → portal+credentials flow into one guided 4-step wizard ending with a copyable invite link.
- **Inline pending state.** Every action that takes more than 300ms shows an inline spinner on the trigger button, never a full-page block.

### Mobile portal (mandatory)

- Bottom-tab navigation on `/portal/*` (Dashboard / Tasks / Documents / Queries) below 768px. Hamburger only on team and admin.
- 44px minimum tap targets on every interactive element.
- Tested on a real Android phone, not Chrome devtools, before launch.

### Keyboard shortcuts (table the build follows)

| Shortcut | Action |
|---|---|
| `Cmd-K` / `/` | Open command palette |
| `g` then `c` | Go to clients |
| `g` then `t` | Go to tasks |
| `g` then `d` | Go to dashboard |
| `n` | New (task / query / client — context-aware) |
| `?` | Show this shortcuts list |
| `Esc` | Close any modal/palette |

### What "elementary" looks like (do not ship)

- Metric cards showing `—`.
- Empty states that say "No data yet" or "Phase 2."
- A separate `/insights` page that lists insights as a table.
- Forms with eight required fields and no defaults.
- Lists you can only read, never filter or sort.
- Status changes with no audit trail you can show the client.
- Action buttons with no loading state.
- Mobile pages that need horizontal scrolling.

### What "sophisticated" looks like (ship this)

- Open the admin dashboard at 9 a.m. → instantly see "3 clients overdue, 2 DSCs expiring this week, ITC gap exceeding 15% on Demo Mfg" without clicking anything.
- Open the client portal → "Your GSTR-3B for April is in review with us. Filing scheduled for 18 May. Projected liability ₹2.4 L (down 8% from March)."
- Cmd-K → type "demo" → first result is the client, second is their last filing, third is the open query.
- Click any number → drill into the rows.
- Every change you make echoes in the audit timeline within one second.
- Every role sees a portal that feels like it was designed for them and nothing else.

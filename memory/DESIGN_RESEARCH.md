# Design Research — Best-in-Class References for TFF Portal

> Date: 2026-05-13
> Goal: Move TFF from "under development" feel to industry-grade professional UX.

---

## 1. Top Design Inspiration Repositories (like Mobbin)

These are live, searchable libraries of real production app screenshots. Use them to study specific flows (e.g. "client onboarding", "task list", "document upload").

| Resource | What it is | Best for | URL |
|---|---|---|---|
| **Mobbin** | 600K+ real app screens from top products (iOS, Android, Web) | Studying exact flows from Stripe, Notion, Linear, Airbnb | mobbin.com |
| **Page Flows** | Curated user flow recordings (video + screenshots) | Understanding end-to-end flows like onboarding, checkout, KYC | pageflows.com |
| **UI Patterns** | Pattern library organised by component type (tables, filters, empty states) | When you need to see 20 different ways to do a filter bar | uipatterns.io |
| **GoodUI** | A/B tested UI patterns with evidence | Conversion-focused patterns (forms, CTAs, pricing) | goodui.org |
| **InspoAI** | AI-powered search across 150K+ design assets | Natural language search: "dark mode SaaS dashboard with data viz" | inspoai.io |
| **Muz.li** | Curated dashboard & landing page galleries | Dashboard inspiration specifically | muz.li |
| **Dribbble** | Designer portfolio shots (more conceptual) | Visual style, colour palettes, typography | dribbble.com |
| **Behance** | Full case studies with process | Deep dives into design systems | behance.net |

**Recommendation for TFF:** Use **Mobbin** + **Page Flows** as primary research tools. Search for:
- "Client portal" (see how TaxDome, Karbon, Liscio handle client views)
- "Admin dashboard" (see how Stripe, Vercel, Linear handle dense data)
- "Task management" (see how Asana, Monday, Linear handle status + assignment)
- "Document upload" (see how Dropbox, Notion, Drive handle file management)

---

## 2. Best-in-Class Reference Products for CA/CS Practice Portals

These are products that serve the exact same audience (accountants, bookkeepers, CA firms) or adjacent audiences (B2B professional services).

### A. Accounting Practice Management (Direct Competitors / References)

| Product | What to steal from it | Specific Screens to Study |
|---|---|---|
| **TaxDome** | All-in-one practice management with client portal | Client dashboard, document request flows, task lists, secure messaging |
| **Karbon** | Workflow automation + client portal | Triage email view, workflow pipelines, team workload dashboard |
| **Uku** | Clean client portal with "magic link" access | Client task list, recurring document requests, white-label portal settings |
| **Canopy** | Client management + document exchange | Client profile layout, document organisation, engagement tracking |
| **Boardroom** | White-labelled client-facing KPI dashboards | Client financial dashboard, advisory reporting views, metric cards |
| **Fathom** | Financial reporting for advisory | Report packs, KPI visualisations, variance analysis presentation |
| **Xero HQ** | Accountant-facing multi-client dashboard | Client list with health indicators, bulk actions, compliance status overview |

### B. General B2B SaaS (Design Quality Benchmarks)

| Product | What to steal from it |
|---|---|
| **Linear** | Information density without clutter; subtle borders; whitespace discipline; command palette; keyboard shortcuts |
| **Stripe Dashboard** | Financial data presentation; table density; status badges; filtering; CSV export flows |
| **Vercel Dashboard** | Project cards, deployment status indicators, clean sidebar nav, hover states |
| **Notion** | Sidebar organisation, nested pages, empty states, template gallery |
| **GitHub** | Issue lists with labels/assignees/status, activity timelines, markdown rendering |
| **Railway / Render** | Clean settings pages, toggle switches, environment variable tables |

### C. Indian Fintech (Local Context + Trust Signals)

| Product | What to steal from it |
|---|---|
| **ClearTax (now Clear)** | Simple tax filing flows, step-by-step wizards, progress indicators, trust badges |
| **Razorpay Dashboard** | Transaction tables, filter bars, date range pickers, INR formatting |
| **Zoho Books** | Side-nav organisation, form layouts for Indian compliance fields (GSTIN, PAN) |

---

## 3. Concrete Design Principles to Apply

Extracted from studying the above references + published design system guidance from Vercel, Linear, and Stripe.

### 3.1 Surface Elevation & Hierarchy (from Vercel's craft philosophy)

- **Sidebar:** Same background as canvas, separated by a subtle 1px border (`border-zinc-200`). Do not use a different background colour for the sidebar — it fragments the visual space.
- **Cards:** White surface with `border-zinc-200`. No shadow by default. Use `shadow-sm` only on hover for interactive cards.
- **Dropdowns / Modals:** One elevation level above their parent. Use `shadow-lg` + `border-zinc-200`.
- **Inputs:** Slightly darker or inset feel. Current TFF inputs are flat — consider a `bg-zinc-50` fill for inputs to signal "type here" without heavy borders.

### 3.2 Border System (The "Squint Test")

Borders should disappear when you are not looking for them. Use a progression:

| Level | Usage | Tailwind |
|---|---|---|
| Ghost | Invisible separation (padding/gap only) | no border |
| Soft | Subtle section dividers | `border-zinc-100` |
| Standard | Card outlines, table rows | `border-zinc-200` |
| Emphasis | Focus rings, active states | `border-teal-500 ring-1 ring-teal-500` |

**Current TFF issue:** Many pages use `border-zinc-200` everywhere, including between unrelated sections. This creates visual noise. Use `border-zinc-100` or whitespace for separation within a card, and reserve `border-zinc-200` for card boundaries.

### 3.3 Typography Scale

Current TFF uses Inter, which is good. But the hierarchy could be tighter:

| Element | Current | Recommended |
|---|---|---|
| Page title | `tff-page-title` (likely 24px) | `text-2xl font-semibold tracking-tight` (24px) |
| Section title | `tff-section-title` | `text-base font-semibold` (16px) + `text-zinc-900` |
| Card label | `tff-kpi-label` | `text-xs font-medium uppercase tracking-wider text-zinc-500` |
| Body | `text-sm text-zinc-600` | `text-sm text-zinc-600 leading-relaxed` |
| Data/mono | `font-mono text-xs` | Keep, but ensure tabular nums: `tabular-nums` |

### 3.4 Dashboard Density (from Linear's best practices)

Linear's dashboard philosophy applies directly to TFF's admin landing page:

1. **Match design to purpose:**
   - *Strategy dashboards* (BizLens, vCFO) → Focus on long-term trends, few metrics, large charts
   - *Operations dashboards* (Tasks, Compliance Calendar) → Wider range of metrics, highlight unexpected changes, dense tables
   - *Status dashboards* (Client list) → Glanceable health indicators, quick actions

2. **Provide context, not just numbers:**
   - Every KPI card should show: **current value + change % + mini sparkline/trend**
   - Example: "GST filings: 18/20" is weak. "GST filings: 18/20 · 2 pending · ↓ from 3 last month" is strong.

3. **Design for the audience:**
   - *Admin* (firm owner) → Needs high-level overview + drill-down. Cards + charts + summary tables.
   - *Team* (staff) → Needs their assigned work + blockers. Task list + alerts + quick actions.
   - *Client* → Needs only their data + what's pending from them. Simpler, larger, friendlier.

### 3.5 Table Design (from Stripe Dashboard)

Stripe's tables are the benchmark for financial data:

- **Header:** `bg-zinc-50/50`, `text-xs font-medium text-zinc-500 uppercase`, no bottom border on header row (use `border-b` on `thead` instead)
- **Row hover:** `hover:bg-zinc-50` (subtle, not jarring)
- **Cell padding:** `py-3 px-4` (generous vertical padding makes scanning easier)
- **Numbers:** Right-aligned, `tabular-nums`, monospaced font for precision data
- **Status:** Pill badges inside cells, not separate columns
- **Actions:** Hidden until hover (or always visible icon buttons on right)

### 3.6 Colour System Refinement

Current TFF palette is good but underutilised:

| Token | Current | Improvement |
|---|---|---|
| Background | `white` | Keep. Consider `bg-zinc-50` for page canvas to make white cards pop |
| Surface | `zinc-50` | Use for inputs, alternate table rows, hover states |
| Primary | `teal-600` | Keep. Add `teal-50` for subtle backgrounds (active nav item, selected row) |
| Success | `green-600` | Use `emerald` instead of `green` for a more premium feel (`emerald-600`) |
| Warning | `yellow-600` | Use `amber-600` for better visibility on white |
| Error | `red-600` | Use `rose-600` for a slightly softer, more professional red |
| Text primary | `zinc-900` | Keep |
| Text secondary | `zinc-500` | Keep, but use `zinc-400` for tertiary (timestamps, metadata) |

### 3.7 Empty States (from Notion + GitHub)

Current TFF has `EmptyState` component. Improve it:

- **Icon:** Use a themed illustration or a large, muted Lucide icon (not just `h-6 w-6` — try `h-12 w-12`)
- **Title:** Bold, but friendly. "No tasks yet" not "Empty task list"
- **Body:** Explain the *benefit* of creating the first item, not just the action
- **Action:** Primary CTA button + optional secondary link
- **Example:**
  ```
  [Large Lightbulb icon]
  No advisory entries yet
  Record your first recommendation to start building
  a searchable history of client advice.
  [Add recommendation]
  ```

---

## 4. Specific Flow Improvements for TFF

### 4.1 Admin Dashboard (Landing Page)

**Current state:** Likely a grid of cards or a simple redirect.

**Best-in-class reference:** Xero HQ + Linear dashboards.

**Recommended structure:**
```
┌─────────────────────────────────────────────┐
│  Good morning, [Name]        [Search] [Bell]│
├──────────┬──────────────────────────────────┤
│  Nav     │  KPI Row (4 cards)               │
│  Sidebar │  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│          │  │Tasks│ │GST │ │IT  │ │TDS │    │
│          │  └────┘ └────┘ └────┘ └────┘    │
│          │                                   │
│          │  ┌─────────────┐ ┌──────────────┐│
│          │  │ My Tasks    │ │ Compliance   ││
│          │  │ (list view) │ │ Calendar     ││
│          │  │             │ │ (mini)       ││
│          │  └─────────────┘ └──────────────┘│
│          │                                   │
│          │  ┌─────────────────────────────┐  │
│          │  │ Recent Activity Timeline    │  │
│          │  └─────────────────────────────┘  │
└──────────┴──────────────────────────────────┘
```

**Key improvements:**
- KPI cards show: **metric + delta + status indicator**
- "My Tasks" is a dense list (not a table) with checkboxes, status dots, and client names
- "Compliance Calendar" is a mini 2-week horizon view, not a full calendar
- Activity timeline uses avatars + concise action text

### 4.2 Client List Page

**Best-in-class reference:** Stripe Customers + Xero HQ.

**Key improvements:**
- Add a **health indicator dot** per client (green = all filings current, amber = pending, red = overdue)
- Add **quick filters** above the table: "All | Active | Onboarding | Premium | At Risk"
- Add **bulk actions** dropdown (already partially built with `SavedViewsBar`)
- Client name is a link, but the entire row should be hoverable with a subtle background shift
- Show **last activity date** (e.g. "2 days ago") instead of raw timestamp

### 4.3 Task Detail Page

**Best-in-class reference:** GitHub Issues + Linear Issue Detail.

**Key improvements:**
- Move metadata (assignee, due date, status) to a **right sidebar** in a compact form
- Use a **timeline** (vertical line with dots) for activity instead of a flat list
- Add **labels** as coloured pills (already partially implemented)
- Status transitions should feel like a **state machine**, not a dropdown: show allowed next states as button chips

### 4.4 Client Portal (Mobile)

**Best-in-class reference:** Uku client portal + banking apps.

**Key improvements:**
- Bottom tab bar (already planned) with **icons + labels**
- Home screen is a **checklist of pending actions**: "Upload Form 16", "Sign document", "Answer query"
- Each pending item is a **card with clear CTA**, not just a list
- Use **generous touch targets** (min 44px height for buttons)
- Documents should show **thumbnail previews** where possible

---

## 5. Action Plan: How to Implement

Instead of a massive redesign, tackle in **phased, page-by-page improvements**:

### Phase 1: Global Polish (1–2 days)
1. Apply border hierarchy (`border-zinc-100` vs `border-zinc-200`)
2. Add `tabular-nums` to all currency and date columns
3. Standardise empty states with larger icons and benefit-focused copy
4. Add `bg-zinc-50` page canvas to make white cards pop

### Phase 2: Dashboard Redesign (2–3 days)
1. Redesign admin landing page with KPI cards + dense task list + mini compliance calendar
2. Add delta indicators (change from last period) to all metric cards
3. Implement "health dot" pattern on client list

### Phase 3: Table Redesign (2 days)
1. Audit all tables across the app
2. Apply Stripe-style table standards (header style, row hover, number alignment, status pills)
3. Add hover-reveal actions where appropriate

### Phase 4: Detail Pages (2–3 days)
1. Redesign task detail with timeline + sidebar metadata
2. Redesign client detail with tabbed organisation + health summary
3. Add state-machine style status transitions

### Phase 5: Mobile Client Portal (3–5 days)
1. Implement bottom tab navigation
2. Redesign portal home as pending-action checklist
3. Increase touch targets and simplify layouts

---

## 6. Recommended Design Systems to Study

If you want to read full design system documentation:

| Design System | Why it matters for TFF | Link |
|---|---|---|
| **Vercel Design** | Craft philosophy, subtle borders, elevation | vercel.com/design |
| **Linear Design** | Dashboard density, information architecture | linear.app/design |
| **Atlassian Design System** | Complex B2B workflows, tables, empty states | atlassian.design |
| **Carbon (IBM)** | Data-heavy tables, forms, enterprise patterns | carbondesignsystem.com |
| **Polaris (Shopify)** | Admin patterns, resource lists, filters | polaris.shopify.com |
| **Radix UI Primitives** | Already used via shadcn/ui — read their accessibility patterns | radix-ui.com |

---

## 7. Quick Wins You Can Apply Today

1. **Add `bg-zinc-50` to the main layout canvas** — instant depth improvement
2. **Change all success badges from `green` to `emerald`** — more premium feel
3. **Add `tabular-nums` to every INR amount and date** — financial precision
4. **Increase empty state icons to `h-12 w-12`** — less "unfinished" feeling
5. **Replace raw dates with relative time** ("2 days ago") in lists — more scannable
6. **Add a 2px `teal-500` left border to active sidebar items** — clearer wayfinding

---

*Next step: Pick Phase 1 (Global Polish) and I can start implementing the changes page by page.*

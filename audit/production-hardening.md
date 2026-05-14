# Production Hardening Checklist

## Vercel
- [ ] All env vars present in Vercel Project → Settings → Environment Variables (Production):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_PROJECT_REF`
  - [ ] `SUPABASE_ACCESS_TOKEN`
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`
  - [ ] `CREDENTIALS_KEY`  ← generate via `openssl rand -base64 32`; **must not change** post-launch
  - [ ] `CRON_SECRET`     ← long random string used to gate manual cron triggers
- [ ] Domain `fiscalfulcrum.in/portal` (or chosen path) routed to this Vercel project
- [ ] Cron schedules verified (vercel.json) — 5 schedules
- [ ] Build passes: `next build` clean, no type errors

## Supabase
- [ ] Project on Pro plan (Point-in-time recovery)
- [ ] `documents` storage bucket private + signed-URL access
- [ ] All tables have RLS enabled (run `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` — must return zero)
- [ ] Service role key never used client-side (verify `'use server'` directive on all `service-role.ts` callers)
- [ ] Daily logical backup enabled

## Resend
- [ ] Sending domain verified (DNS records SPF / DKIM / DMARC)
- [ ] `from` email matches verified domain

## Marketing site integration
- [ ] DNS: marketing site root + portal sub-path do not conflict
- [ ] `/login` link added to marketing nav under “Client Portal”
- [ ] Logout in AppShell redirects to marketing root (verify in `app-shell.tsx`)

## DPDP
- [ ] Privacy policy + Terms accessible at `/legal/*`
- [ ] DPO email reachable
- [ ] Data-export procedure documented (operations playbook)

## Observability
- [ ] Vercel Analytics enabled
- [ ] Resend email delivery monitored
- [ ] Supabase audit log queryable from `/admin/audit`

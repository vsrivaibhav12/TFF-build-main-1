# Soft-Launch Run-book

## T-7 days
- [ ] Production environment fully provisioned (see `production-hardening.md`)
- [ ] 3 internal accounts created (one admin, one team, one demo client)
- [ ] DPDP audit completed and signed-off (`day-31-evidence.md`)
- [ ] Marketing CTA added to fiscalfulcrum.in (“Client Portal →”)

## T-3 days
- [ ] Onboard first 3 real clients via wizard (`/admin/clients/new`)
- [ ] Verify each client can log in, sees only their data, sees only their enabled modules
- [ ] Verify notification emails arrive (use immediate frequency for test users)
- [ ] Confirm one full payroll run for one team member

## T-0
- [ ] Send launch email to all clients with portal credentials
- [ ] Publish marketing-site banner
- [ ] Monitor `/admin/audit` for 4 hours — watch for anomalies

## T+1 day
- [ ] Review notification preferences distribution (most users on `daily`)
- [ ] Check Vercel logs for runtime errors
- [ ] Triage any “Permission denied” errors — either grant capability or fix code

## T+7 days
- [ ] Collect feedback from first 5 clients (NPS + freeform)
- [ ] Plan polish-loop sprint based on feedback
- [ ] Re-run DPDP RLS spot-checks

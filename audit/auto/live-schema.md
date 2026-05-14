# Live Supabase Schema Snapshot
Project: `gpaiixbgaxfpvlshyybx`  •  Pulled: 2026-05-14T10:06:01.186Z

**Totals:** 75 public tables · 132 RLS policies · 149 FKs · 223 indexes · 1 functions · 0 enums · 4 storage buckets

## Tables

| Table | Cols | RLS | Policies | FKs | Idx | ~Rows |
|---|---:|---:|---:|---:|---:|---:|
| `attendance_logs` | 19 | ✅ | 2 | 2 | 4 | -1 |
| `benchmarks` | 10 | ❌ | 0 | 0 | 2 | -1 |
| `billing_entities` | 21 | ✅ | 2 | 1 | 1 | -1 |
| `bizlens_data` | 58 | ✅ | 5 | 3 | 4 | 1 |
| `bizlens_period_snapshots` | 9 | ✅ | 1 | 2 | 3 | -1 |
| `client_communication_log` | 14 | ✅ | 1 | 3 | 2 | -1 |
| `client_compliance_profiles` | 19 | ✅ | 2 | 1 | 1 | -1 |
| `client_feature_flags` | 7 | ❌ | 0 | 2 | 3 | -1 |
| `client_groups` | 5 | ✅ | 1 | 0 | 2 | -1 |
| `client_import_batches` | 10 | ✅ | 1 | 1 | 2 | -1 |
| `client_lifecycle_stage` | 8 | ❌ | 0 | 1 | 3 | -1 |
| `client_portal_visibility` | 6 | ✅ | 3 | 2 | 3 | -1 |
| `client_services` | 11 | ✅ | 1 | 3 | 6 | 2 |
| `client_sub_services` | 8 | ✅ | 1 | 2 | 4 | -1 |
| `client_users` | 8 | ✅ | 1 | 2 | 3 | -1 |
| `clients` | 36 | ✅ | 5 | 5 | 6 | -1 |
| `compliance_calendar_events` | 9 | ✅ | 3 | 3 | 4 | 85 |
| `compliance_calendar_rules` | 14 | ✅ | 2 | 0 | 4 | -1 |
| `compliance_insights` | 13 | ❌ | 0 | 1 | 2 | -1 |
| `compliance_status` | 11 | ✅ | 2 | 1 | 4 | -1 |
| `cost_centres` | 5 | ✅ | 2 | 0 | 1 | -1 |
| `credentials` | 13 | ✅ | 5 | 1 | 2 | -1 |
| `document_requests` | 12 | ✅ | 3 | 5 | 4 | -1 |
| `documents` | 19 | ✅ | 2 | 2 | 3 | -1 |
| `dsc_records` | 27 | ✅ | 5 | 3 | 4 | -1 |
| `engagement_letters` | 12 | ❌ | 0 | 2 | 2 | -1 |
| `financial_data` | 12 | ✅ | 1 | 3 | 3 | -1 |
| `firm_profile` | 14 | ❌ | 0 | 0 | 1 | -1 |
| `global_audit_log` | 9 | ❌ | 0 | 1 | 3 | -1 |
| `gst_data_entries` | 21 | ✅ | 1 | 3 | 3 | -1 |
| `gst_filings` | 28 | ✅ | 3 | 4 | 6 | -1 |
| `gst_monthly_data` | 30 | ✅ | 1 | 2 | 3 | -1 |
| `hearings` | 18 | ❌ | 0 | 3 | 2 | -1 |
| `income_tax_slabs` | 11 | ✅ | 1 | 1 | 3 | -1 |
| `it_filings` | 19 | ✅ | 3 | 4 | 3 | -1 |
| `leave_requests` | 13 | ❌ | 0 | 2 | 2 | -1 |
| `notices` | 19 | ✅ | 3 | 2 | 3 | -1 |
| `notification_preferences` | 5 | ✅ | 2 | 1 | 2 | -1 |
| `notifications` | 13 | ❌ | 0 | 1 | 2 | -1 |
| `payroll_adjustments` | 8 | ❌ | 0 | 2 | 1 | -1 |
| `payroll_runs` | 20 | ✅ | 2 | 2 | 3 | -1 |
| `profit_centres` | 5 | ✅ | 2 | 0 | 1 | -1 |
| `queries` | 13 | ✅ | 6 | 4 | 3 | -1 |
| `query_messages` | 6 | ✅ | 2 | 2 | 2 | -1 |
| `saved_views` | 7 | ✅ | 1 | 1 | 3 | -1 |
| `service_categories` | 6 | ✅ | 2 | 0 | 2 | -1 |
| `services` | 10 | ✅ | 2 | 1 | 4 | 2 |
| `solution_log` | 16 | ✅ | 1 | 3 | 2 | -1 |
| `staff_capabilities` | 7 | ✅ | 2 | 3 | 4 | -1 |
| `staff_payroll_settings` | 12 | ✅ | 2 | 1 | 2 | -1 |
| `staff_role_template_capabilities` | 3 | ✅ | 1 | 1 | 3 | -1 |
| `staff_role_templates` | 7 | ✅ | 2 | 1 | 2 | -1 |
| `sub_service_document_request_templates` | 7 | ✅ | 2 | 1 | 2 | -1 |
| `sub_service_sop_steps` | 9 | ✅ | 2 | 1 | 3 | -1 |
| `sub_services` | 17 | ✅ | 2 | 1 | 3 | -1 |
| `task_activity` | 8 | ✅ | 2 | 2 | 3 | -1 |
| `task_custom_field_definitions` | 10 | ✅ | 2 | 2 | 3 | -1 |
| `task_custom_field_values` | 8 | ✅ | 1 | 2 | 3 | -1 |
| `task_document_requests` | 13 | ✅ | 1 | 2 | 3 | -1 |
| `task_label_assignments` | 3 | ✅ | 1 | 2 | 1 | -1 |
| `task_labels` | 5 | ✅ | 2 | 0 | 1 | -1 |
| `task_notes` | 7 | ✅ | 2 | 2 | 2 | -1 |
| `task_steps` | 13 | ✅ | 3 | 4 | 5 | 7 |
| `task_template_steps` | 10 | ✅ | 2 | 1 | 3 | -1 |
| `task_templates` | 16 | ✅ | 1 | 3 | 2 | -1 |
| `task_workdone` | 11 | ✅ | 2 | 3 | 4 | -1 |
| `tasks` | 48 | ✅ | 5 | 8 | 14 | 1 |
| `tds_filings` | 22 | ✅ | 3 | 4 | 3 | -1 |
| `team_client_assignment` | 8 | ✅ | 1 | 2 | 3 | -1 |
| `user_billing_entity_access` | 3 | ✅ | 2 | 2 | 1 | -1 |
| `users_profile` | 22 | ✅ | 3 | 3 | 5 | 3 |
| `vcfo_snapshots` | 16 | ✅ | 1 | 2 | 3 | -1 |
| `vendor_gst_filings` | 11 | ❌ | 0 | 2 | 2 | -1 |
| `vendors` | 14 | ✅ | 0 | 1 | 2 | -1 |
| `work_done` | 10 | ✅ | 2 | 3 | 5 | -1 |

## Storage Buckets

- `bizlens-exports` (public=false, size_limit=26214400)
- `documents` (public=false, size_limit=52428800)
- `dsc-files` (public=false, size_limit=5242880)
- `engagement-letters` (public=false, size_limit=26214400)

## Enums


## Functions (public)

- `current_user_role() → text` [sql]

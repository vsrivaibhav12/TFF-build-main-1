# Schema Drift Report
App code ↔ Live Supabase (`gpaiixbgaxfpvlshyybx`)

**App references:** 67 tables across 402 source files
**Live DB:** 75 public tables

## 🔴 Tables referenced in app but MISSING in live DB

| Table | Sample files |
|---|---|
| `query_replies` | lib/actions/queries.ts |
| `dsc` | app/admin/compliance/page.tsx |

## 🟡 Live tables NEVER referenced in app code

- `benchmarks`
- `client_communication_log`
- `client_feature_flags`
- `client_lifecycle_stage`
- `engagement_letters`
- `firm_profile`
- `payroll_adjustments`
- `task_document_requests`
- `vendor_gst_filings`
- `vendors`

## 🟠 Column drift — table exists, but column referenced in app is NOT in live

| Table | Missing columns |
|---|---|
| `users_profile` | `action`, `assigned_to`, `client_id`, `description`, `due_date`, `email_sent`, `entity_id`, `entity_type`, `html`, `is_blocked_on_client`, `name`, `onConflict`, `performed_by`, `period_month`, `period_year`, `priority`, `role_in_client`, `sub_service_id`, `subject`, `teamUserId`, `title`, `to`, `user_id` |
| `attendance_logs` | `onConflict` |
| `clients` | `assigned_from`, `assigned_to`, `benchmark_value`, `client_id`, `clients`, `dsc_class`, `dsc_type`, `expiry_date`, `headline`, `holder_name`, `insight_type`, `insights_recorded`, `is_active`, `name`, `narrative`, `payload`, `portal_name`, `raw_value`, `recommended_action`, `role`, `role_in_client`, `severity`, `teamUserId`, `team_user_id`, `user_id` |
| `client_import_batches` | `batch_id` |
| `compliance_calendar_rules` | `generated`, `regenerated` |
| `credentials` | `action`, `details`, `entity_id`, `entity_type`, `password`, `performed_by` |
| `tasks` | `action`, `ascending`, `changed_by`, `created_by`, `display_order`, `document_name`, `duration_minutes`, `ended_at`, `entry_method`, `field_name`, `is_required`, `message`, `new_value`, `note`, `related_entity_id`, `related_entity_type`, `started_at`, `task_id`, `type`, `unblocked`, `userId`, `user_id`, `work_date` |
| `document_requests` | `action`, `changed_by`, `document_id`, `field_name`, `new_value`, `unblocked` |
| `client_users` | `assigned_from`, `is_enabled`, `module_key`, `name`, `onConflict`, `payload`, `role`, `teamUserId`, `team_user_id`, `updated_by` |
| `task_activity` | `ascending`, `completed_at`, `description`, `display_order`, `document_id`, `document_name`, `is_required`, `unblocked` |
| `documents` | `action`, `changed_by`, `contentType`, `field_name`, `fulfilled_at`, `fulfilled_by_document_id`, `message`, `new_value`, `related_entity_id`, `related_entity_type`, `task_id`, `title`, `type`, `upsert`, `user_id` |
| `dsc_records` | `checked`, `portal_name` |
| `leave_requests` | `message`, `related_entity_id`, `related_entity_type`, `title`, `type` |
| `notices` | `amountInvolved`, `clientId`, `hearing_held_date`, `hearing_scheduled_date`, `hearing_type`, `identifiedBy`, `next_hearing_date`, `noticeId`, `noticeSubject`, `notice_id` |
| `notifications` | `digests_sent`, `email_frequency`, `in_app_enabled`, `onConflict`, `recipients` |
| `notification_preferences` | `email_sent`, `html`, `input`, `message`, `notification_type`, `onConflict`, `related_entity_id`, `related_entity_type`, `send_via_email`, `subject`, `title`, `to` |
| `staff_payroll_settings` | `onConflict` |
| `payroll_runs` | `deduction_applicable`, `monthly_salary`, `onConflict`, `paid_leaves_per_month`, `salary_adjustment_for_leaves` |
| `client_portal_visibility` | `action`, `details`, `entity_id`, `entity_type`, `onConflict`, `performedBy`, `performed_by` |
| `queries` | `clientId`, `identifiedBy`, `message`, `queryId`, `query_id`, `user_id` |
| `staff_role_templates` | `action`, `capabilities`, `capability`, `capability_count`, `details`, `entity_id`, `entity_type`, `granted`, `performed_by`, `template_id`, `user_id` |
| `staff_role_template_capabilities` | `action`, `active_role_template_id`, `capabilities`, `capability_count`, `details`, `entity_id`, `entity_type`, `performed_by`, `user_id` |
| `saved_views` | `ascending`, `onConflict` |
| `services` | `due_day_of_month`, `frequency`, `is_active`, `is_recurring`, `is_required`, `requires_client_input`, `requires_verification`, `service_id`, `step_order`, `title`, `updated_at` |
| `sub_services` | `is_required`, `step_order`, `sub_service_id`, `title` |
| `sub_service_sop_steps` | `client_id`, `is_active`, `service_id` |
| `client_sub_services` | `description`, `is_blocked_on_client`, `priority`, `service_id`, `title` |
| `client_services` | `assigned_to`, `description`, `due_date`, `is_blocked_on_client`, `period_month`, `period_year`, `priority`, `sub_service_id`, `title` |
| `staff_capabilities` | `action`, `details`, `entity_id`, `entity_type`, `granted`, `message`, `performed_by`, `revoked`, `title`, `type` |
| `task_custom_field_values` | `code`, `color_hex`, `display_name`, `onConflict` |
| `task_labels` | `assigned`, `label_code`, `onConflict`, `task_id` |
| `task_label_assignments` | `onConflict` |
| `task_steps` | `action`, `ascending`, `changed_by`, `field_name`, `new_value`, `step_id`, `step_ids` |
| `task_templates` | `guidance_notes`, `is_required`, `step_order`, `task_template_id` |
| `vcfo_snapshots` | `clientId`, `identifiedBy`, `onConflict`, `snapshotId` |
| `solution_log` | `actualFinancialImpact`, `actualOutcome`, `category`, `clientId`, `description`, `identifiedBy`, `recommendedSolution` |
| `bizlens_data` | `updates` |
| `client_groups` | `business_name`, `category`, `client_id`, `group_id`, `gstin`, `is_active`, `lifecycle_stage`, `notes`, `onConflict`, `pan`, `portal_enabled`, `primary_owner_id`, `role_in_client`, `user_id` |
| `team_client_assignment` | `is_deleted`, `is_enabled`, `module_key`, `name`, `onConflict`, `payload`, `updated_by` |
| `service_categories` | `category_id`, `code`, `service_id`, `service_kind` |
| `task_notes` | `completed_at`, `is_required` |


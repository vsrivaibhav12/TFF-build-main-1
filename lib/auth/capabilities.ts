/**
 * Closed list of named capabilities (v1). Do not invent new ones.
 * This file is NOT marked server-only so it can be imported by client components.
 */
export const ALL_CAPABILITIES = [
  'clients.read.all', 'clients.create', 'clients.edit', 'clients.delete',
  'clients.assign_team', 'clients.toggle_portal',
  'services.manage', 'services.assign',
  'staff.manage', 'staff.grant_capabilities',
  'dsc.manage', 'credentials.manage',
  'tasks.assign', 'tasks.complete', 'tasks.create', 'tasks.delete',
  'compliance.enter', 'notices.manage', 'hearings.manage',
  'bizlens.enter', 'vcfo.enter',
  'payroll.run',
  'attendance.approve', 'leave.approve',
  'documents.upload', 'documents.delete',
  'queries.assign',
  'audit.view', 'firm_dashboard.view', 'insights.configure',
  // v3 additions
  'verify_tasks',
  'manage_billing_entities',
  'manage_compliance_rules',
  'manage_custom_fields',
  'view_workdone_reports',
  'manage_solution_log',
  'promote_to_admin',
] as const;

export type Capability = typeof ALL_CAPABILITIES[number];

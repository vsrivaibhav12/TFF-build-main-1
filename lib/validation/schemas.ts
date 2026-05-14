import { z } from 'zod';

export const clientCategoryEnum = z.enum([
  'sole_proprietor', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'huf', 'aop', 'ngo', 'other',
]);
export const lifecycleStageEnum = z.enum([
  'lead', 'caas_only', 'caas_bizlens', 'caas_vcfo', 'caas_bizlens_vcfo', 'full_suite', 'churn',
]);

const nullableStr = (max = 200) => z.string().max(max).optional().nullable().or(z.literal(''));

export const createClientSchema = z.object({
  business_name: z.string().min(2, 'Business name is required').max(200),
  business_registration_number: nullableStr(80),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN').optional().nullable().or(z.literal('')),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN').optional().nullable().or(z.literal('')),
  category: clientCategoryEnum.optional().nullable(),
  industry: nullableStr(120),
  primary_contact_person: nullableStr(120),
  primary_contact_email: z.string().email().optional().nullable().or(z.literal('')),
  primary_contact_phone: nullableStr(30),
  city: nullableStr(80),
  state: nullableStr(80),
  pincode: nullableStr(10),
  lifecycle_stage: lifecycleStageEnum.default('lead'),
  group_id: z.string().uuid().optional().nullable(),
  primary_owner_id: z.string().uuid().optional().nullable(),
  portal_enabled: z.boolean().default(false),
  notes: nullableStr(2000),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial().extend({ id: z.string().uuid() });
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

// v3 verification — separate from status. Clients never see this.
export const verificationStatusEnum = z.enum(['not_required', 'pending', 'verified']);
export type VerificationStatus = z.infer<typeof verificationStatusEnum>;

// v3 stuck-reason taxonomy.
export const stuckReasonEnum = z.enum([
  'client_clarification', 'gst_portal_down', 'itd_portal_down', 'mcadown',
  'mismatch_investigation', 'awaiting_third_party', 'awaiting_management',
  'dsc_issue', 'payment_pending', 'other',
]);
export type StuckReason = z.infer<typeof stuckReasonEnum>;

export const createTaskSchema = z.object({
  client_id: z.string().uuid(),
  sub_service_id: z.string().uuid().optional().nullable(),
  task_template_id: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  reviewer_id: z.string().uuid().optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  period_year: z.number().int().min(2000).max(2100).optional().nullable(),
  period_month: z.number().int().min(1).max(12).optional().nullable(),
  period_quarter: z.number().int().min(1).max(4).optional().nullable(),
  is_billable: z.boolean().default(false),
  bill_reference: z.string().max(80).optional().nullable(),
  bill_amount: z.number().nonnegative().optional().nullable(),
  arn_reference: z.string().max(120).optional().nullable(),
  is_arn_client_visible: z.boolean().default(false),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskBillingSchema = z.object({
  task_id: z.string().uuid(),
  is_billable: z.boolean(),
  bill_reference: z.string().max(80).optional().nullable(),
  bill_amount: z.number().nonnegative().optional().nullable(),
});
export type UpdateTaskBillingInput = z.infer<typeof updateTaskBillingSchema>;

export const updateTaskArnSchema = z.object({
  task_id: z.string().uuid(),
  arn_reference: z.string().max(120).optional().nullable(),
  is_arn_client_visible: z.boolean().optional(),
});
export type UpdateTaskArnInput = z.infer<typeof updateTaskArnSchema>;

export const reopenTaskSchema = z.object({
  task_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});
export type ReopenTaskInput = z.infer<typeof reopenTaskSchema>;

export const transitionTaskSchema = z.object({
  task_id: z.string().uuid(),
  to_status: taskStatusEnum,
  note: z.string().max(2000).optional(),
});

export const filingStatusEnum = z.enum(['not_started', 'data_received', 'in_progress', 'review', 'filed']);
export const gstReturnTypeEnum = z.enum(['GSTR-1', 'GSTR-3B', 'GSTR-9']);

export const gstFilingSchema = z.object({
  client_id: z.string().uuid(),
  return_type: gstReturnTypeEnum,
  period_year: z.number().int().min(2000).max(2100),
  period_month: z.number().int().min(1).max(12),
  status: filingStatusEnum.default('not_started'),
  filed_date: z.string().date().optional().nullable(),
  ack_number: z.string().max(80).optional().nullable(),
  taxable_turnover: z.number().nonnegative().optional().nullable(),
  output_tax_total: z.number().nonnegative().optional().nullable(),
  itc_claimed: z.number().nonnegative().optional().nullable(),
  net_tax_payable: z.number().optional().nullable(),
  late_fee: z.number().nonnegative().optional().nullable(),
  interest_amount: z.number().nonnegative().optional().nullable(),
  change_reason: z.string().max(500).optional().nullable(),
});
export type GstFilingInput = z.infer<typeof gstFilingSchema>;

export const tdsFilingSchema = z.object({
  client_id: z.string().uuid(),
  period_quarter: z.number().int().min(1).max(4),
  period_year: z.number().int().min(2000).max(2100),
  status: filingStatusEnum.default('not_started'),
  filed_date: z.string().date().optional().nullable(),
  ack_number: z.string().max(80).optional().nullable(),
  total_deductions: z.number().nonnegative().optional().nullable(),
  tax_deposited: z.number().nonnegative().optional().nullable(),
  deductee_count: z.number().int().nonnegative().optional().nullable(),
  change_reason: z.string().max(500).optional().nullable(),
});
export type TdsFilingInput = z.infer<typeof tdsFilingSchema>;

export const itFilingSchema = z.object({
  client_id: z.string().uuid(),
  fy_ending_year: z.number().int().min(2000).max(2100),
  status: filingStatusEnum.default('not_started'),
  filed_date: z.string().date().optional().nullable(),
  ack_number: z.string().max(80).optional().nullable(),
  gross_income: z.number().optional().nullable(),
  deductions_claimed: z.number().nonnegative().optional().nullable(),
  taxable_income: z.number().optional().nullable(),
  tax_liability: z.number().nonnegative().optional().nullable(),
  refund_amount: z.number().optional().nullable(),
  change_reason: z.string().max(500).optional().nullable(),
});
export type ItFilingInput = z.infer<typeof itFilingSchema>;

export const createQuerySchema = z.object({
  client_id: z.string().uuid(),
  task_id: z.string().uuid().optional().nullable(),
  subject: z.string().min(2).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});
export type CreateQueryInput = z.infer<typeof createQuerySchema>;

export const replyQuerySchema = z.object({
  query_id: z.string().uuid(),
  message: z.string().min(1).max(5000),
});

export const noticeSchema = z.object({
  client_id: z.string().uuid(),
  notice_type: z.enum(['GST', 'Income Tax', 'TDS', 'Other']),
  notice_number: z.string().max(80).optional().nullable(),
  issuing_authority: z.string().max(120).optional().nullable(),
  notice_date: z.string().date().optional().nullable(),
  notice_received_date: z.string().date().optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  amount_involved: z.number().nonnegative().optional().nullable(),
  subject: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  status: z.enum(['received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 'order_pending', 'order_received', 'closed']).default('received'),
});

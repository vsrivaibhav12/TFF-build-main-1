'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { refreshComplianceEvents } from '@/lib/services/compliance-calendar-engine';

const profileSchema = z.object({
  client_id: z.string().uuid(),
  gst_filing_frequency: z.enum(['monthly', 'qrmp', 'not_applicable']).optional().nullable(),
  state_group: z.enum(['A', 'B']).optional().nullable(),
  entity_type: z.enum(['company','llp','firm','proprietorship','huf','trust','aop','boi','individual']).optional().nullable(),
  is_audit_applicable: z.boolean().default(false),
  is_tds_deductor: z.boolean().default(false),
  is_tcs_collector: z.boolean().default(false),
  is_advance_tax_applicable: z.boolean().default(false),
  is_pf_applicable: z.boolean().default(false),
  is_esi_applicable: z.boolean().default(false),
  is_pt_applicable: z.boolean().default(false),
  pt_state: z.string().max(40).optional().nullable(),
  is_roc_applicable: z.boolean().default(false),
  agm_date: z.string().date().optional().nullable(),
  is_transfer_pricing: z.boolean().default(false),
  annual_turnover_estimate: z.number().nonnegative().optional().nullable(),
  fy_start_month: z.number().int().min(1).max(12).default(4),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * Upsert the client compliance profile and immediately refresh the calendar
 * events so the UI shows the right rows next render.
 */
export async function upsertClientComplianceProfileAction(
  input: z.infer<typeof profileSchema>,
): Promise<ActionResult<{ client_id: string; refreshed: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.enter');
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const payload = { ...parsed.data, updated_at: new Date().toISOString() };
    const { error } = await sb
      .from('client_compliance_profiles')
      .upsert(payload, { onConflict: 'client_id' });
    if (error) return fail(error.message, 'DB');
    const r = await refreshComplianceEvents({ clientId: parsed.data.client_id });
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    revalidatePath('/admin/compliance');
    return ok({ client_id: parsed.data.client_id, refreshed: r.generated });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  rule_code: z.string().min(1).max(40),
  display_name: z.string().min(1).max(120),
  service_kind: z.string().min(1).max(40),
  periodicity: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_off']),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
  due_month_offset: z.number().int().min(0).max(12).default(1),
  due_date_formula: z.string().max(120).optional().nullable(),
  applies_when: z.record(z.any()).default({}),
  reminder_days: z.array(z.number().int().nonnegative()).default([7, 3, 1]),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function upsertComplianceRuleAction(
  input: z.infer<typeof ruleSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'manage_compliance_rules');
    const parsed = ruleSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const payload = { ...parsed.data, updated_at: new Date().toISOString() };
    if (parsed.data.id) {
      const { error } = await sb.from('compliance_calendar_rules').update(payload).eq('id', parsed.data.id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/settings/compliance-rules');
      return ok({ id: parsed.data.id });
    }
    const { data, error } = await sb.from('compliance_calendar_rules').insert(payload).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/compliance-rules');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function toggleComplianceRuleActiveAction(input: { id: string; is_active: boolean }): Promise<ActionResult<{ regenerated: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'manage_compliance_rules');
    const sb = createClient();
    const { error } = await sb
      .from('compliance_calendar_rules')
      .update({ is_active: input.is_active, updated_at: new Date().toISOString() })
      .eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    // Regenerate calendar events so disabled rules disappear and enabled rules reappear
    const r = await refreshComplianceEvents();
    revalidatePath('/admin/settings/compliance-rules');
    revalidatePath('/admin/compliance');
    revalidatePath('/portal/calendar');
    return ok({ regenerated: r.generated });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function refreshAllComplianceEventsAction(): Promise<ActionResult<{ generated: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'manage_compliance_rules');
    const r = await refreshComplianceEvents();
    revalidatePath('/admin/compliance');
    return ok({ generated: r.generated });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

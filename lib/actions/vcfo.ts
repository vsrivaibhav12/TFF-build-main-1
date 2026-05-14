'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { logVcfoSnapshot } from '@/lib/services/solution-log-service';

const snapshotSchema = z.object({
  client_id: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  cash_in_bank: z.number().optional(),
  monthly_burn: z.number().optional(),
  revenue: z.number().optional(),
  budgeted_revenue: z.number().optional(),
  budgeted_expenses: z.number().optional(),
  actual_revenue: z.number().optional(),
  actual_expenses: z.number().optional(),
  advisor_notes: z.string().optional(),
  key_expenses: z.record(z.number()).optional(),
});
export async function upsertVcfoSnapshotAction(input: z.infer<typeof snapshotSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'vcfo.enter');
    const parsed = snapshotSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    // Read prior monthly_burn so we can compute the delta (material change → solution-log entry)
    const { data: prior } = await sb
      .from('vcfo_snapshots')
      .select('monthly_burn')
      .eq('client_id', parsed.data.client_id)
      .eq('month', parsed.data.month)
      .eq('year', parsed.data.year)
      .maybeSingle();
    const priorBurn = (prior as any)?.monthly_burn ?? null;

    const { data, error } = await sb
      .from('vcfo_snapshots')
      .upsert({ ...parsed.data, data_entered_by: me.id, updated_at: new Date().toISOString() }, { onConflict: 'client_id,month,year' })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');

    // Auto-log to solution_log when there's a material burn delta (>10%) or first-time snapshot with runway
    const newBurn = parsed.data.monthly_burn ?? null;
    const cash = parsed.data.cash_in_bank ?? null;
    const runwayMonths = cash != null && newBurn && newBurn > 0 ? cash / newBurn : undefined;
    const burnDelta = priorBurn != null && newBurn != null ? newBurn - priorBurn : undefined;
    const materialChange = burnDelta != null && priorBurn > 0 && Math.abs(burnDelta) / priorBurn >= 0.10;
    if (priorBurn == null || materialChange) {
      await logVcfoSnapshot({
        clientId: parsed.data.client_id,
        identifiedBy: me.id,
        snapshotId: data.id,
        runwayMonths,
        burnDelta,
      });
    }

    revalidatePath(`/team/clients/${parsed.data.client_id}/vcfo`);
    revalidatePath('/portal/vcfo');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const solutionSchema = z.object({
  client_id: z.string().uuid(),
  issue_identified_date: z.string(),
  issue_description: z.string().min(1),
  issue_category: z.enum(['cash_flow', 'profitability', 'tax_optimization', 'working_capital', 'vendor_management', 'process', 'compliance', 'other']),
  recommended_solution: z.string().min(1),
  financial_impact_estimate: z.number().optional(),
  root_cause: z.string().optional(),
});
export async function addSolutionAction(input: z.infer<typeof solutionSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'vcfo.enter');
    const parsed = solutionSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data, error } = await sb
      .from('solution_log')
      .insert({ ...parsed.data, identified_by: me.id, solution_status: 'recommended' })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/clients/${parsed.data.client_id}/vcfo`);
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const updateSolutionSchema = z.object({
  id: z.string().uuid(),
  solution_status: z.enum(['recommended', 'implemented', 'monitoring', 'closed']),
});

export async function updateSolutionStatusAction(input: z.infer<typeof updateSolutionSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'vcfo.enter');
    const parsed = updateSolutionSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb
      .from('solution_log')
      .update({ solution_status: parsed.data.solution_status, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/vcfo');
    revalidatePath('/team/clients');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

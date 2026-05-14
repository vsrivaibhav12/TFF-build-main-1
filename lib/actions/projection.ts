'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function saveProjectionAction(input: {
  client_id: string;
  fy_ending_year: number;
  gross_income: number;
  tax: number;
  tds_paid: number;
  notes?: string;
}): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.enter');
    const sb = createClient();
    const { error } = await sb.from('compliance_insights').insert({
      client_id: input.client_id,
      insight_type: 'other',
      period_year: input.fy_ending_year,
      headline: `FY${input.fy_ending_year} tax projection`,
      narrative: `Gross ₹${input.gross_income.toLocaleString('en-IN')}; tax ₹${input.tax.toLocaleString('en-IN')}; TDS paid ₹${input.tds_paid.toLocaleString('en-IN')}.`,
      raw_value: input.gross_income,
      benchmark_value: input.tds_paid,
      severity: 'info',
      recommended_action: input.notes ?? null,
    });
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/clients/${input.client_id}/projection`);
    revalidatePath('/portal/projection');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, ServiceError, type ActionResult } from '@/lib/actions/result';
import { gstFilingSchema, tdsFilingSchema, itFilingSchema, type GstFilingInput, type TdsFilingInput, type ItFilingInput } from '@/lib/validation/schemas';

/**
 * Versioning rule (per BUILD_PLAN §Compliance):
 * Inserting/updating a filing for an existing (client, period) creates a NEW row
 * and marks the previous row's is_current=false + superseded_by=newRow.id.
 */
async function supersedeAndInsert<T extends { client_id: string }>(
  table: 'gst_filings' | 'tds_filings' | 'it_filings',
  match: Record<string, any>,
  payload: T,
  performedBy: string,
) {
  const sb = createClient();
  // Find existing current row (if any) for this period
  const matchClauses = Object.entries(match);
  let q = sb.from(table).select('id').eq('is_current', true);
  for (const [k, v] of matchClauses) q = q.eq(k, v);
  const { data: existing } = await q.maybeSingle();

  // Insert new current row
  const { data: inserted, error } = await sb
    .from(table)
    .insert({ ...payload, is_current: true, data_entered_by: performedBy, data_entered_date: new Date().toISOString() })
    .select('id')
    .single();
  if (error) throw new ServiceError(error.message, error.code);

  // Supersede previous
  if (existing?.id) {
    await sb
      .from(table)
      .update({ is_current: false, superseded_by: inserted.id, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  }
  return inserted.id as string;
}

export async function upsertGstFilingAction(input: GstFilingInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.enter');
    const parsed = gstFilingSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const id = await supersedeAndInsert('gst_filings',
      { client_id: parsed.data.client_id, period_year: parsed.data.period_year, period_month: parsed.data.period_month, return_type: parsed.data.return_type } as any,
      parsed.data,
      me.id,
    );
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    return ok({ id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function upsertTdsFilingAction(input: TdsFilingInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.enter');
    const parsed = tdsFilingSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const id = await supersedeAndInsert('tds_filings',
      { client_id: parsed.data.client_id, period_year: parsed.data.period_year, period_quarter: parsed.data.period_quarter } as any,
      parsed.data,
      me.id,
    );
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    return ok({ id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function upsertItFilingAction(input: ItFilingInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.enter');
    const parsed = itFilingSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const id = await supersedeAndInsert('it_filings',
      { client_id: parsed.data.client_id, fy_ending_year: parsed.data.fy_ending_year } as any,
      parsed.data,
      me.id,
    );
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    return ok({ id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

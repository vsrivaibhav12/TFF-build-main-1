'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const schema = z.object({
  client_id: z.string().uuid(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2000).max(2100),
  turnover_taxable: z.number().nonnegative().default(0),
  turnover_exempt: z.number().nonnegative().default(0),
  turnover_nil_rated: z.number().nonnegative().default(0),
  turnover_zero_rated: z.number().nonnegative().default(0),
  output_cgst: z.number().nonnegative().default(0),
  output_sgst: z.number().nonnegative().default(0),
  output_igst: z.number().nonnegative().default(0),
  output_cess: z.number().nonnegative().default(0),
  input_2b_cgst: z.number().nonnegative().default(0),
  input_2b_sgst: z.number().nonnegative().default(0),
  input_2b_igst: z.number().nonnegative().default(0),
  input_2b_cess: z.number().nonnegative().default(0),
  input_books_cgst: z.number().nonnegative().default(0),
  input_books_sgst: z.number().nonnegative().default(0),
  input_books_igst: z.number().nonnegative().default(0),
  input_books_cess: z.number().nonnegative().default(0),
  tax_paid_cash_cgst: z.number().nonnegative().default(0),
  tax_paid_cash_sgst: z.number().nonnegative().default(0),
  tax_paid_cash_igst: z.number().nonnegative().default(0),
  tax_paid_cash_cess: z.number().nonnegative().default(0),
  carry_forward_itc: z.number().nonnegative().default(0),
  vendor_filing_percent: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export async function upsertGstMonthlyDataAction(input: z.infer<typeof schema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.enter');
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const payload = { ...parsed.data, created_by: me.id, updated_at: new Date().toISOString() };
    const { error } = await sb.from('gst_monthly_data').upsert(payload, { onConflict: 'client_id,period_month,period_year' });
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/gst');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

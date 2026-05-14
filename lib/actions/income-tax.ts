'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import * as repo from '@/lib/repositories/income-tax';

const slabSchema = z.object({
  id: z.string().uuid().optional(),
  assessment_year: z.string().min(1),
  category: z.string().min(1),
  min_income: z.number().nonnegative(),
  max_income: z.number().nonnegative().nullable().optional(),
  rate_percent: z.number().min(0).max(100),
  surcharge_percent: z.number().min(0).max(100).default(0),
  cess_percent: z.number().min(0).max(100).default(4),
});

export async function listIncomeTaxSlabsAction(assessmentYear?: string): Promise<ActionResult<repo.IncomeTaxSlab[]>> {
  try {
    await requireRole('admin');
    const rows = await repo.listIncomeTaxSlabs(assessmentYear);
    return ok(rows);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function upsertIncomeTaxSlabAction(input: z.infer<typeof slabSchema>): Promise<ActionResult<repo.IncomeTaxSlab>> {
  try {
    const me = await requireRole('admin');
    const parsed = slabSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const data = parsed.data;
    const row = await repo.upsertIncomeTaxSlab({
      assessment_year: data.assessment_year,
      category: data.category,
      min_income: data.min_income,
      max_income: data.max_income ?? null,
      rate_percent: data.rate_percent,
      surcharge_percent: data.surcharge_percent,
      cess_percent: data.cess_percent,
      created_by: me.id,
    });
    revalidatePath('/admin/settings/tax-rates');
    return ok(row);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteIncomeTaxSlabAction(id: string): Promise<ActionResult<void>> {
  try {
    await requireRole('admin');
    await repo.deleteIncomeTaxSlab(id);
    revalidatePath('/admin/settings/tax-rates');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

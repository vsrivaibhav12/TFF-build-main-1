'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const codeRegex = /^[A-Z0-9_-]{1,12}$/;

const centreSchema = z.object({
  code: z.string().min(1).max(12).regex(codeRegex, 'Use A-Z, 0-9, underscore or hyphen, max 12 chars'),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function upsertProfitCentreAction(input: z.infer<typeof centreSchema>): Promise<ActionResult<{ code: string }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.manage');
    const parsed = centreSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb
      .from('profit_centres')
      .upsert(parsed.data, { onConflict: 'code' });
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/profit-cost-centres');
    return ok({ code: parsed.data.code });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function upsertCostCentreAction(input: z.infer<typeof centreSchema>): Promise<ActionResult<{ code: string }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.manage');
    const parsed = centreSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb
      .from('cost_centres')
      .upsert(parsed.data, { onConflict: 'code' });
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/profit-cost-centres');
    return ok({ code: parsed.data.code });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteCentreAction(input: { table: 'profit_centres' | 'cost_centres'; code: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.manage');
    const sb = createClient();
    // Soft-deactivate rather than hard-delete (FKs)
    const { error } = await sb.from(input.table).update({ is_active: false }).eq('code', input.code);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/profit-cost-centres');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const billingEntitySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  legal_name: z.string().max(160).optional().nullable(),
  gstin: z.string().max(15).optional().nullable(),
  pan: z.string().max(10).optional().nullable(),
  address_line1: z.string().max(160).optional().nullable(),
  address_line2: z.string().max(160).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  invoice_prefix: z.string().min(1).max(40),
  default_profit_centre_code: z.string().max(12).optional().nullable(),
  signing_authority_name: z.string().max(120).optional().nullable(),
  signing_authority_designation: z.string().max(120).optional().nullable(),
  bank_account_name: z.string().max(120).optional().nullable(),
  bank_account_number: z.string().max(40).optional().nullable(),
  bank_ifsc: z.string().max(15).optional().nullable(),
  bank_name: z.string().max(120).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function upsertBillingEntityAction(input: z.infer<typeof billingEntitySchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'manage_billing_entities');
    const parsed = billingEntitySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const payload = { ...parsed.data, updated_at: new Date().toISOString() };
    if (parsed.data.id) {
      const { error } = await sb.from('billing_entities').update(payload).eq('id', parsed.data.id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/settings/billing-entities');
      return ok({ id: parsed.data.id });
    }
    const { data, error } = await sb.from('billing_entities').insert(payload).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/settings/billing-entities');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function setBillingEntityAccessAction(input: {
  user_id: string;
  billing_entity_ids: string[];
}): Promise<ActionResult<{ granted: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'manage_billing_entities');
    if (!input.user_id) return fail('user_id required', 'VALIDATION');
    const sb = createClient();
    // Replace set: delete then re-insert.
    await sb.from('user_billing_entity_access').delete().eq('user_id', input.user_id);
    if (input.billing_entity_ids.length > 0) {
      const rows = input.billing_entity_ids.map((id) => ({ user_id: input.user_id, billing_entity_id: id }));
      const { error } = await sb.from('user_billing_entity_access').insert(rows);
      if (error) return fail(error.message, 'DB');
    }
    revalidatePath('/admin/settings/billing-entities');
    return ok({ granted: input.billing_entity_ids.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

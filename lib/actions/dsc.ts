'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { encryptString } from '@/lib/services/encryption';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const dscSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  holder_name: z.string().min(1),
  holder_contact_email: z.string().email().or(z.literal('')).optional(),
  holder_phone: z.string().optional(),
  dsc_class: z.enum(['Class 2', 'Class 3']),
  dsc_type: z.enum(['eSign', 'eToken']),
  certificate_serial: z.string().optional(),
  certificate_issuer: z.string().optional(),
  issued_date: z.string().optional(),
  expiry_date: z.string().min(1),
  status: z.enum(['active', 'revoked', 'suspended', 'expired']).default('active'),
  custodian_name: z.string().optional(),
  custodian_phone: z.string().optional(),
  physical_location: z.string().optional(),
  registered_portals: z.array(z.string()).optional(),
  pin: z.string().optional(),
  password: z.string().optional(),
});
export type DscInput = z.infer<typeof dscSchema>;

export async function upsertDscAction(input: DscInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'dsc.manage');
    const parsed = dscSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const { id, pin, password, ...rest } = parsed.data;
    const sb = createClient();
    // Prevent client_id mutation on update — vault records must stay bound to their client.
    const payload: any = {
      ...rest,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    };
    delete payload.client_id;
    if (rest.holder_contact_email === '') payload.holder_contact_email = null;
    if (pin) payload.encrypted_pin = encryptString(pin);
    if (password) payload.encrypted_password = encryptString(password);

    if (id) {
      const { error } = await sb.from('dsc_records').update(payload).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/dsc');
      return ok({ id });
    }
    payload.created_by = me.id;
    const { data, error } = await sb.from('dsc_records').insert(payload).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/dsc');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteDscAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'dsc.manage');
    const sb = createClient();
    const { error } = await sb.from('dsc_records').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/dsc');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

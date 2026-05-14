'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { encryptString, decryptString } from '@/lib/services/encryption';
import { writeAudit } from '@/lib/services/audit-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const credSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  portal_name: z.string().min(1),
  portal_url: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  security_question: z.string().optional(),
  security_answer: z.string().optional(),
  is_active: z.boolean().default(true),
});
export type CredentialInput = z.infer<typeof credSchema>;

export async function upsertCredentialAction(input: CredentialInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'credentials.manage');
    const parsed = credSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const { id, password, security_answer, ...rest } = parsed.data;
    const sb = createClient();
    // Prevent client_id mutation on update — vault records must stay bound to their client.
    const payload: any = { ...rest, updated_at: new Date().toISOString() };
    delete payload.client_id;
    if (password) payload.encrypted_password = encryptString(password);
    if (security_answer) payload.encrypted_security_answer = encryptString(security_answer);

    if (id) {
      const { error } = await sb.from('credentials').update(payload).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/credentials');
      return ok({ id });
    }
    const { data, error } = await sb.from('credentials').insert(payload).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/credentials');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteCredentialAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'credentials.manage');
    const sb = createClient();
    const { error } = await sb.from('credentials').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/credentials');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Audited decrypt action. Every successful reveal writes:
 *   action: 'credential.decrypt', entity_type: 'credential', entity_id: id
 */
export async function revealCredentialAction(id: string): Promise<ActionResult<{ password: string; security_answer: string | null }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'credentials.manage');
    const sb = createClient();
    const { data, error } = await sb
      .from('credentials')
      .select('id, client_id, portal_name, encrypted_password, encrypted_security_answer')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return fail('Not found', 'NOT_FOUND');
    let password = '';
    let security_answer: string | null = null;
    try {
      password = (data as any).encrypted_password ? decryptString((data as any).encrypted_password) : '';
      security_answer = (data as any).encrypted_security_answer ? decryptString((data as any).encrypted_security_answer) : null;
    } catch (e: any) {
      return fail('Decryption failed: ' + (e?.message ?? 'unknown'), 'DECRYPT');
    }
    await sb.from('credentials').update({ last_used_date: new Date().toISOString().slice(0, 10) }).eq('id', id);
    await writeAudit({
      action: 'credential.decrypt',
      entity_type: 'credential',
      entity_id: id,
      performed_by: me.id,
      details: { client_id: (data as any).client_id, portal_name: (data as any).portal_name },
    });
    return ok({ password, security_answer });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

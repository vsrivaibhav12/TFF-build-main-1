'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function linkSubServiceAction(input: { client_id: string; sub_service_id: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { data: existing } = await sb
      .from('client_sub_services')
      .select('id')
      .eq('client_id', input.client_id)
      .eq('sub_service_id', input.sub_service_id)
      .maybeSingle();
    if (existing) return fail('Already linked', 'DUPLICATE');
    const { error } = await sb.from('client_sub_services').insert({ ...input, is_active: true });
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function unlinkSubServiceAction(input: { id: string; client_id: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { error } = await sb.from('client_sub_services').delete().eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function linkServiceToClientAction(input: { client_id: string; service_id: string; access_level?: 'full' | 'limited' | 'view_only'; service_head_id?: string | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { data: existing } = await sb
      .from('client_services')
      .select('id')
      .eq('client_id', input.client_id)
      .eq('service_id', input.service_id)
      .maybeSingle();
    if (existing) return fail('Already linked', 'DUPLICATE');
    const { error } = await sb.from('client_services').insert({
      client_id: input.client_id,
      service_id: input.service_id,
      access_level: input.access_level ?? 'limited',
      service_head_id: input.service_head_id ?? null,
      start_date: new Date().toISOString().slice(0, 10),
      is_active: true,
    });
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    revalidatePath('/portal');
    revalidatePath('/portal/dashboard');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateClientServiceHeadAction(input: { id: string; client_id: string; service_head_id?: string | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { error } = await sb.from('client_services').update({ service_head_id: input.service_head_id ?? null, updated_at: new Date().toISOString() }).eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { z } from 'zod';
import { createQuerySchema, replyQuerySchema, type CreateQueryInput } from '@/lib/validation/schemas';
import { logQueryResolved } from '@/lib/services/solution-log-service';

export async function createQueryAction(input: CreateQueryInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'queries.assign');
    const parsed = createQuerySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data, error } = await sb
      .from('queries')
      .insert({
        client_id: parsed.data.client_id,
        user_id: me.id,
        subject: parsed.data.subject,
        description: parsed.data.description,
        status: 'open',
      })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/queries');
    revalidatePath('/portal/queries');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function replyQueryAction(input: { query_id: string; message: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    const parsed = replyQuerySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('query_replies').insert({
      query_id: parsed.data.query_id,
      user_id: me.id,
      message: parsed.data.message,
    });
    if (error) return fail(error.message, 'DB');
    // Bump query.updated_at and flip status based on who replied:
    //  • client           → 'open'        (waiting on team)
    //  • team / admin     → 'in_progress' (waiting on client)
    const nextStatus = me.role === 'client' ? 'open' : 'in_progress';
    await sb
      .from('queries')
      .update({ updated_at: new Date().toISOString(), status: nextStatus })
      .eq('id', parsed.data.query_id);
    revalidatePath(`/portal/queries/${parsed.data.query_id}`);
    revalidatePath(`/team/queries/${parsed.data.query_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function closeQueryAction(input: { query_id: string; resolution_notes?: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'queries.assign');
    const sb = createClient();
    // Read prior state so we only log once per close transition
    const { data: prior } = await sb.from('queries').select('status, subject, client_id').eq('id', input.query_id).maybeSingle();
    const { error } = await sb
      .from('queries')
      .update({
        status: 'resolved',
        resolution_notes: input.resolution_notes ?? null,
        resolved_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.query_id);
    if (error) return fail(error.message, 'DB');
    if (prior && (prior as any).status !== 'resolved') {
      await logQueryResolved({
        clientId: (prior as any).client_id,
        identifiedBy: me.id,
        queryId: input.query_id,
        subject: (prior as any).subject ?? 'Client query',
      });
    }
    revalidatePath(`/team/queries/${input.query_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const updateStatusSchema = z.object({
  query_id: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

export async function updateQueryStatusAction(input: z.infer<typeof updateStatusSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'queries.assign');
    const parsed = updateStatusSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const updates: any = { status: parsed.data.status, updated_at: new Date().toISOString() };
    if (parsed.data.status === 'resolved') {
      updates.resolved_date = new Date().toISOString();
    }
    const { error } = await sb.from('queries').update(updates).eq('id', parsed.data.query_id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/queries/${parsed.data.query_id}`);
    revalidatePath('/team/queries');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

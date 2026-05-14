'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const createSchema = z.object({
  client_id: z.string().uuid(),
  hearing_type: z.enum(['GST', 'Income Tax', 'TDS', 'Other']),
  subject: z.string().min(1).max(300),
  hearing_scheduled_date: z.string().date(),
  venue: z.string().max(200).optional().nullable(),
  officer_name: z.string().max(200).optional().nullable(),
  status: z.enum(['scheduled', 'held', 'adjourned', 'concluded']).default('scheduled'),
});

export async function createHearingAction(input: z.infer<typeof createSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'hearings.manage');
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data, error } = await sb.from('hearings').insert({
      client_id: parsed.data.client_id,
      hearing_type: parsed.data.hearing_type,
      subject: parsed.data.subject,
      hearing_scheduled_date: parsed.data.hearing_scheduled_date,
      venue: parsed.data.venue ?? null,
      officer_name: parsed.data.officer_name ?? null,
      status: parsed.data.status,
      assigned_to: me.id,
    }).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/hearings');
    revalidatePath('/team/hearings');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

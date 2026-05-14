'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const schema = z.object({
  scope: z.string().min(1),
  name: z.string().min(1).max(60),
  filters: z.record(z.any()),
  is_default: z.boolean().optional(),
});
export async function saveSavedViewAction(input: z.infer<typeof schema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireUser();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    if (parsed.data.is_default) {
      await sb.from('saved_views').update({ is_default: false }).eq('user_id', me.id).eq('scope', parsed.data.scope);
    }
    const { data, error } = await sb
      .from('saved_views')
      .upsert({ user_id: me.id, ...parsed.data }, { onConflict: 'user_id,scope,name' })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteSavedViewAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireUser();
    const sb = createClient();
    const { error } = await sb.from('saved_views').delete().eq('id', id).eq('user_id', me.id);
    if (error) return fail(error.message, 'DB');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function listSavedViews(scope: string) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb
    .from('saved_views')
    .select('id, name, is_default, filters')
    .eq('user_id', user.id)
    .eq('scope', scope)
    .order('name', { ascending: true });
  return data ?? [];
}

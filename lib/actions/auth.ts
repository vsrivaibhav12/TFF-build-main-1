'use server';
import { createClient } from '@/lib/supabase/server';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function sendPasswordResetAction(email: string): Promise<ActionResult<void>> {
  try {
    const sb = createClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login/reset`,
    });
    if (error) return fail(error.message, 'AUTH');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

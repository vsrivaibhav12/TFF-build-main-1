'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const createSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().trim().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['team', 'admin']),
  job_title: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  phone_number: z.string().trim().optional().nullable(),
});

/**
 * Create a new internal user (team or admin). Admin-only.
 *
 * Flow:
 *  1. Create auth user via Supabase Auth admin API (service-role).
 *     - Admin assigns password directly; user can sign in immediately.
 *  2. Insert matching users_profile row (id = auth user id).
 *  3. Return the new user's id so the UI can route to their detail page.
 *
 * If the email already exists in auth, we surface a friendly error.
 */
export async function createTeamMemberAction(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<{ user_id: string }>> {
  try {
    await requireRole('admin');
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    }
    const v = parsed.data;
    const sb = createServiceClient();

    // 1. Create auth user with admin-assigned password.
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: v.email,
      password: v.password,
      email_confirm: true,
      user_metadata: { full_name: v.full_name, role: v.role },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create auth user';
      // Most common case: duplicate email
      if (/already.*registered|already.*exists/i.test(msg)) {
        return fail('A user with this email already exists', 'DUPLICATE');
      }
      return fail(msg, 'AUTH');
    }
    const authUserId = created.user.id;

    // 2. Upsert the profile (auth-trigger may have already created a row;
    //    in case not, this guarantees one exists with the right role).
    const { error: profErr } = await sb.from('users_profile').upsert({
      id: authUserId,
      full_name: v.full_name,
      email: v.email,
      role: v.role,
      job_title: v.job_title || null,
      department: v.department || null,
      phone_number: v.phone_number || null,
      is_active: true,
    });
    if (profErr) return fail(`Auth user created but profile upsert failed: ${profErr.message}`, 'DB');

    revalidatePath('/admin/team');
    return ok({ user_id: authUserId });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const toggleActiveSchema = z.object({
  user_id: z.string().uuid(),
  is_active: z.boolean(),
});

export async function toggleTeamMemberActiveAction(
  input: z.infer<typeof toggleActiveSchema>,
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    const parsed = toggleActiveSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');
    if (parsed.data.user_id === me.id) {
      return fail('You cannot deactivate your own account', 'SELF');
    }
    const sb = createServiceClient();
    const { error } = await sb
      .from('users_profile')
      .update({ is_active: parsed.data.is_active })
      .eq('id', parsed.data.user_id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/team');
    revalidatePath(`/admin/team/${parsed.data.user_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

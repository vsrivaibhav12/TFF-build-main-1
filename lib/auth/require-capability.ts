import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ServiceError } from '@/lib/actions/result';
import type { AppUser } from '@/lib/auth/require-role';
import { ALL_CAPABILITIES, type Capability } from '@/lib/auth/capabilities';

/**
 * Returns true if the user has the capability. Admin implicitly has all.
 * Caller can assume requireRole has already run.
 */
export async function hasCapability(user: AppUser, capability: Capability): Promise<boolean> {
  if (user.role === 'admin') return true;
  const sb = createClient();
  const { data } = await sb
    .from('staff_capabilities')
    .select('id')
    .eq('user_id', user.id)
    .eq('capability', capability)
    .is('revoked_at', null)
    .maybeSingle();
  return !!data;
}

export async function requireCapability(user: AppUser, capability: Capability): Promise<void> {
  const ok = await hasCapability(user, capability);
  if (!ok) {
    throw new ServiceError(`Missing capability: ${capability}`, 'NO_CAPABILITY');
  }
}

/**
 * Hard variant for use directly in pages (not actions): redirects to / if missing.
 */
export async function requireCapabilityOrRedirect(user: AppUser, capability: Capability) {
  if (!(await hasCapability(user, capability))) redirect('/');
}

export async function listCapabilitiesForUser(userId: string): Promise<Capability[]> {
  const sb = createClient();
  const { data } = await sb
    .from('staff_capabilities')
    .select('capability')
    .eq('user_id', userId)
    .is('revoked_at', null);
  return (data ?? []).map((r: any) => r.capability);
}

import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AppRole = 'admin' | 'team' | 'client';

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  full_name: string | null;
  is_active: boolean;
  is_prime_admin?: boolean;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // users_profile.id IS auth.users.id (per schema v3)
  const { data: profile } = await supabase
    .from('users_profile')
    .select('id, email, role, full_name, is_active, is_prime_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;
  return profile as AppUser;
}

export async function requireUser(): Promise<AppUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireRole(allowed: AppRole | AppRole[]): Promise<AppUser> {
  const user = await requireUser();
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedArr.includes(user.role)) {
    redirect('/');
  }
  return user;
}

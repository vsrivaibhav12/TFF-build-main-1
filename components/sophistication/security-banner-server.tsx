import { createServiceClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';
import { ShieldAlert, ArrowRight } from 'lucide-react';

/**
 * Server-side 2FA banner. Counts admin/team users without an enrolled MFA
 * factor and renders a banner if any are missing it. Reads from Supabase Auth
 * via the admin API.
 */
export default async function SecurityBannerServer() {
  try {
    const sb = createClient();
    // Only admins see this banner.
    const { data: { user: authUser } } = await sb.auth.getUser();
    if (!authUser) return null;
    const { data: profile } = await sb
      .from('users_profile')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle();
    if (profile?.role !== 'admin') return null;

    // Use service role to enumerate auth users + their factors. This requires
    // the service role key (server-only). Page size 100 is fine for small firms.
    const admin = createServiceClient();
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });

    // Pull the team/admin profiles to match against
    const { data: profiles } = await sb
      .from('users_profile')
      .select('id, full_name, email, role')
      .in('role', ['team', 'admin'])
      .eq('is_active', true);

    const internalIds = new Set((profiles ?? []).map((p: any) => p.id));
    const missing = (authUsers ?? []).filter((u: any) => {
      if (!internalIds.has(u.id)) return false;
      const factors = (u.factors ?? []) as any[];
      const verified = factors.some((f) => f.status === 'verified');
      return !verified;
    });
    if (missing.length === 0) return null;

    return (
      <div className="bg-amber-50 border-y border-amber-200 text-amber-900 px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span>
            <strong>{missing.length}</strong>{' '}
            {missing.length === 1 ? 'team member doesn’t' : 'team members don’t'} have
            two-factor authentication enabled.
            {' '}Configure 2FA in Supabase Auth project settings to protect client data.
          </span>
        </div>
        <a
          href="https://supabase.com/dashboard/project/_/auth/providers"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline hover:text-amber-700"
        >
          Set up 2FA <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    );
  } catch {
    // Banner is best-effort; never block the page.
    return null;
  }
}

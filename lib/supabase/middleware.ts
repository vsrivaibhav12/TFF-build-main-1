import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth + role-prefix middleware.
 *
 * - Logged-out users hitting any protected prefix → /login
 * - Logged-in users hitting /login → / (home, then role-routed)
 * - Logged-in users hitting a prefix that doesn't match their role →
 *   redirected straight to their own home. This is the fix for the
 *   "one click → flicker into the wrong section" UX bug.
 *
 * `requireRole(...)` on each layout is still the canonical security check;
 * middleware here is defense-in-depth + UX (no wrong-layout flicker).
 */

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  team: '/team',
  client: '/portal',
};

const ROLE_ALLOWED_PREFIX: Record<string, string> = {
  admin: '/admin',
  team: '/team',
  client: '/portal',
};

// Paths anyone authenticated may hit (account-self, legal, /api/cmdk for search, etc.)
const ROLE_NEUTRAL_PREFIXES = ['/account', '/legal', '/api/cmdk', '/api/notifications', '/api/sub-services'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do NOT remove getUser(). It refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const protectedPrefixes = ['/portal', '/team', '/admin'];
  const matchedProtected = protectedPrefixes.find((p) => path === p || path.startsWith(p + '/'));

  // 1) Not logged in → /login
  if (matchedProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // 2) Logged in but hitting /login → home (role-routed by app/page.tsx)
  if (path === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 3) Logged in + hitting a protected prefix → ensure prefix matches role
  if (matchedProtected && user) {
    // Role-neutral paths (like /account) bypass the role-prefix check entirely
    const isNeutral = ROLE_NEUTRAL_PREFIXES.some((p) => path.startsWith(p));
    if (!isNeutral) {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle();
      const role = profile?.role as string | undefined;

      // Inactive or no profile → bounce to /login (safer than letting them roam)
      if (!profile || profile.is_active === false || !role) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('reason', 'inactive');
        return NextResponse.redirect(url);
      }

      const allowedPrefix = ROLE_ALLOWED_PREFIX[role];
      const home = ROLE_HOME[role] ?? '/';
      if (allowedPrefix && matchedProtected !== allowedPrefix) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

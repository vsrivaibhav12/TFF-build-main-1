import { createClient as _createClient } from '@supabase/supabase-js';

/**
 * Service-role client. BYPASSES RLS.
 * Use ONLY in:
 *   - app/api/cron/* (Vercel Cron)
 *   - app/api/webhooks/*
 *   - one-off scripts (seed, schema apply)
 * NEVER expose to the browser. NEVER import from a Client Component.
 */
export function createServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Service-role client must never be used in the browser.');
  }
  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Create Supabase Storage buckets needed by the portal.
 * Idempotent: skips buckets that already exist.
 *
 *   documents          - all client documents (RLS via folder = client_id)
 *   dsc-files          - DSC certificate uploads (encrypted at rest)
 *   engagement-letters - signed engagement letters (consent record)
 *   bizlens-exports    - BizLens PDF exports
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import WS from 'ws';
(globalThis as any).WebSocket = WS;
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const buckets = [
  { id: 'documents', public: false, fileSizeLimit: 50 * 1024 * 1024 },
  { id: 'dsc-files', public: false, fileSizeLimit: 5 * 1024 * 1024 },
  { id: 'engagement-letters', public: false, fileSizeLimit: 25 * 1024 * 1024 },
  { id: 'bizlens-exports', public: false, fileSizeLimit: 25 * 1024 * 1024 },
];

async function main() {
  const { data: existing } = await sb.storage.listBuckets();
  const existingIds = new Set((existing ?? []).map((b) => b.id));

  for (const b of buckets) {
    if (existingIds.has(b.id)) {
      console.log(`[buckets] ${b.id} \u2013 already exists`);
      continue;
    }
    const { error } = await sb.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.fileSizeLimit,
    });
    if (error) {
      console.error(`[buckets] ${b.id} FAILED: ${error.message}`);
    } else {
      console.log(`[buckets] ${b.id} \u2013 created`);
    }
  }
  console.log('[buckets] DONE');
}

main().catch((e) => {
  console.error('[buckets] FATAL', e?.message ?? e);
  process.exit(1);
});

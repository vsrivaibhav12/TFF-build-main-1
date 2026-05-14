import * as dotenv from 'dotenv'; dotenv.config({ path: '/app/.env.local' });
import { createClient } from '@supabase/supabase-js'; import ws from 'ws';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { realtime: { transport: ws as any } });
(async () => {
  const { data, error } = await sb.storage.listBuckets();
  console.log('Buckets:', error ? error.message : (data?.map(b=>b.name).join(', ') || '(none)'));
})();

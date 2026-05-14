import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * v3 Cmd-K record search. Returns clients, tasks, notices.
 * RLS enforces row visibility per role.
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ clients: [], tasks: [], notices: [] }, { status: 401 });
  const q = (new URL(req.url)).searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ clients: [], tasks: [], notices: [] });
  const sb = createClient();
  const like = `%${q}%`;
  const [clients, tasks, notices] = await Promise.all([
    sb.from('clients')
      .select('id, business_name, gstin, pan')
      .eq('is_deleted', false)
      .or(`business_name.ilike.${like},gstin.ilike.${like},pan.ilike.${like}`)
      .limit(8),
    sb.from('tasks')
      .select('id, title, status, clients(business_name)')
      .ilike('title', like)
      .limit(8),
    sb.from('notices')
      .select('id, subject, notice_type, status, clients(business_name)')
      .or(`subject.ilike.${like},notice_type.ilike.${like}`)
      .limit(8),
  ]);
  return NextResponse.json({
    clients: clients.data ?? [],
    tasks: (tasks.data ?? []).map((t: any) => ({ ...t, client_name: t.clients?.business_name })),
    notices: (notices.data ?? []).map((n: any) => ({ ...n, client_name: n.clients?.business_name })),
  });
}

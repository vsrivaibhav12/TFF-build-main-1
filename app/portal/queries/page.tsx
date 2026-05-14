import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { listQueries } from '@/lib/repositories/queries';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateIST } from '@/lib/utils';
import NewQueryDialog from './new-query';
import { Plus, MessageSquare } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function PortalQueries() {
  const me = await requireRole('client');
  const [items, clients] = await Promise.all([
    listQueries({ mineOnly: true, userId: me.id }),
    listAccessibleClients(),
  ]);
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="tff-page-title">Queries</h1>
          <p className="tff-page-subtitle">Open a question to your CA team.</p>
        </div>
        <NewQueryDialog clients={clients as any} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No queries yet"
          body="Click 'Raise query' to start a conversation with your engagement team."
          icon={<MessageSquare className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white divide-y">{items.map((q: any) => (
          <Link key={q.id} href={`/portal/queries/${q.id}`} className="flex items-center justify-between p-4 hover:bg-zinc-50"><div><div className="font-medium">{q.subject}</div><div className="text-xs text-zinc-500">{q.clients?.business_name} · {formatDateIST(q.updated_at)}</div></div><Badge variant={q.status === 'open' ? 'warning' : q.status === 'resolved' ? 'success' : 'teal'}>{q.status}</Badge></Link>
        ))}</div>
      )}
    </div>
  );
}

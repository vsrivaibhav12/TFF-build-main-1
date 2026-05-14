import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQueryWithMessages } from '@/lib/repositories/queries';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';
import QueryReply from '@/app/team/queries/[id]/reply';

export const dynamic = 'force-dynamic';

export default async function PortalQueryDetail({ params }: { params: { id: string } }) {
  const data = await getQueryWithMessages(params.id);
  if (!data) notFound();
  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/portal/queries" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"><ChevronLeft className="h-4 w-4" /> Queries</Link>
      <div>
        <h1 className="tff-page-title">{data.query.subject}</h1>
        <Badge variant={data.query.status === 'open' ? 'warning' : data.query.status === 'resolved' ? 'success' : 'teal'} >{data.query.status}</Badge>
      </div>
      <div className="space-y-3">
        {data.messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500">No messages yet. Your team will respond shortly.</div>
        ) : (data.messages.map((m: any) => (
          <div key={m.id} className={`rounded-xl border border-zinc-200 p-4 ${m.users_profile?.role === 'client' ? 'bg-teal-50 border-teal-100' : 'bg-white'}`}><div className="flex justify-between items-baseline mb-2"><span className="text-sm font-medium">{m.users_profile?.full_name}</span><span className="text-xs text-zinc-500">{formatDateIST(m.created_at)}</span></div><p className="text-sm whitespace-pre-wrap">{m.message_text}</p></div>
        )))}
      </div>
      {data.query.status !== 'resolved' && data.query.status !== 'closed' && <QueryReply queryId={data.query.id} canClose={false} />}
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { ChevronRight, Building2, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function AdminQueriesPage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: queries } = await sb
    .from('queries')
    .select('id, subject, status, created_at, clients(business_name), users_profile:created_by(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Queries</h1>
          <p className="tff-page-subtitle">Monitor and resolve active client communications.</p>
        </div>
      </div>

      {(!queries || queries.length === 0) ? (
        <EmptyState
          title="No queries yet"
          body="Client queries will appear here once raised through the portal."
          icon={<MessageSquare className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Subject &amp; client</TableHead>
                <TableHead>Raised by</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((q: any) => (
                <TableRow key={q.id} data-row>
                  <TableCell>
                    <Link href={`/admin/queries/${q.id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                      {q.subject}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{(q.clients as any)?.business_name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-700">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      {(q.users_profile as any)?.full_name ?? 'Client user'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={q.status === 'resolved' ? 'success' : 'warning'}>{q.status}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-700 tabular-nums">{formatDateIST(q.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/queries/${q.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      aria-label="Open query"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

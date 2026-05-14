import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import AuditFilters from './filters';
import EmptyState from '@/components/sophistication/empty-state';
import { Scroll } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditPage({ searchParams }: { searchParams: { actor?: string; action?: string; entity?: string; from?: string; to?: string } }) {
  const sb = createClient();
  let q = sb
    .from('global_audit_log')
    .select('id, action, entity_type, entity_id, details, performed_by, performed_at, users_profile(full_name, email)')
    .order('performed_at', { ascending: false })
    .limit(200);
  if (searchParams.actor) q = q.eq('performed_by', searchParams.actor);
  if (searchParams.action) q = q.eq('action', searchParams.action);
  if (searchParams.entity) q = q.eq('entity_type', searchParams.entity);
  if (searchParams.from) q = q.gte('performed_at', searchParams.from);
  if (searchParams.to) q = q.lte('performed_at', searchParams.to);
  const { data } = await q;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="tff-page-title">Audit trail</h1>
        <p className="tff-page-subtitle">Every privileged action across the firm. Filterable, exportable on request.</p>
      </div>
      <AuditFilters initial={searchParams} />
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Actor</TableHead><TableHead>When</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
          <TableBody>{(data ?? []).length === 0 ? (
            <TableRow><TableCell colSpan={5} className="p-0"><EmptyState title="No audit entries" body="Privileged actions will appear here once recorded." icon={<Scroll className="h-6 w-6 text-zinc-400" />} /></TableCell></TableRow>
          ) : ((data ?? []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell><Badge variant="outline" className="font-mono text-[10px]">{r.action}</Badge></TableCell>
              <TableCell><span className="text-xs">{r.entity_type}</span><div className="font-mono text-[10px] text-zinc-400">{r.entity_id?.slice(0, 8)}</div></TableCell>
              <TableCell className="text-xs">{r.users_profile?.full_name ?? '—'}<div className="text-zinc-400">{r.users_profile?.email}</div></TableCell>
              <TableCell className="text-xs">{formatDateIST(r.performed_at)}</TableCell>
              <TableCell className="font-mono text-[10px] text-zinc-500 max-w-xs truncate">{r.details ? JSON.stringify(r.details) : '—'}</TableCell>
            </TableRow>
          )))}</TableBody>
        </Table>
      </div>
    </div>
  );
}

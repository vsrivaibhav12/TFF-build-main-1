import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';
import { FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GroupWiseReportPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requireRole('admin');
  const sb = createClient();

  const fy = searchParams.fy ? parseInt(searchParams.fy, 10) : new Date().getFullYear();
  const fyStart = `${fy}-04-01`;
  const fyEnd = `${fy + 1}-03-31`;

  const { data: clients } = await sb
    .from('clients')
    .select('id, business_name, group_id, client_groups!clients_group_id_fkey(name)')
    .eq('is_deleted', false);

  const { data: cssRows } = await sb
    .from('client_sub_services')
    .select('client_id, fee_amount, is_active')
    .eq('is_active', true);

  const { data: taskRows } = await sb
    .from('tasks')
    .select('client_id, status, bill_amount, billed, completed_date')
    .eq('is_deleted', false)
    .gte('completed_date', fyStart)
    .lte('completed_date', fyEnd);

  // Aggregate by group
  const byGroup: Record<string, {
    name: string;
    clientCount: number;
    serviceCount: number;
    totalFee: number;
    tasksCompleted: number;
    totalBilled: number;
    totalPending: number;
  }> = {};

  for (const c of clients ?? []) {
    const gId = c.group_id ?? '_ungrouped';
    const gName = (c.client_groups as any)?.name ?? 'Ungrouped';
    if (!byGroup[gId]) {
      byGroup[gId] = { name: gName, clientCount: 0, serviceCount: 0, totalFee: 0, tasksCompleted: 0, totalBilled: 0, totalPending: 0 };
    }
    byGroup[gId].clientCount++;
  }

  for (const row of cssRows ?? []) {
    const client = (clients ?? []).find((c: any) => c.id === row.client_id);
    if (!client) continue;
    const gId = client.group_id ?? '_ungrouped';
    if (!byGroup[gId]) continue;
    byGroup[gId].serviceCount++;
    byGroup[gId].totalFee += row.fee_amount || 0;
  }

  for (const t of taskRows ?? []) {
    const client = (clients ?? []).find((c: any) => c.id === t.client_id);
    if (!client) continue;
    const gId = client.group_id ?? '_ungrouped';
    if (!byGroup[gId]) continue;
    if (t.status === 'completed') byGroup[gId].tasksCompleted++;
    if (t.billed && t.bill_amount) byGroup[gId].totalBilled += t.bill_amount;
    if (!t.billed && t.bill_amount) byGroup[gId].totalPending += t.bill_amount;
  }

  const grandTotalFee = Object.values(byGroup).reduce((s, g) => s + g.totalFee, 0);
  const grandTotalBilled = Object.values(byGroup).reduce((s, g) => s + g.totalBilled, 0);
  const grandTotalPending = Object.values(byGroup).reduce((s, g) => s + g.totalPending, 0);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Group-wise report</h1>
          <p className="tff-page-subtitle">Aggregated view by client group for FY {fy}-{fy + 1}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tff-card p-5"><div className="tff-kpi-value">₹{grandTotalFee.toLocaleString('en-IN')}</div><div className="tff-kpi-label mt-1">Total fees</div></div>
        <div className="tff-card p-5"><div className="tff-kpi-value text-emerald-600">₹{grandTotalBilled.toLocaleString('en-IN')}</div><div className="tff-kpi-label mt-1">Billed</div></div>
        <div className="tff-card p-5"><div className="tff-kpi-value text-amber-600">₹{grandTotalPending.toLocaleString('en-IN')}</div><div className="tff-kpi-label mt-1">Pending</div></div>
      </div>

      <div className="flex justify-end">
        <ExportButton data={Object.values(byGroup).map((g) => ({
          group: g.name,
          clients: g.clientCount,
          services: g.serviceCount,
          'tasks done': g.tasksCompleted,
          fee: g.totalFee,
          billed: g.totalBilled,
          pending: g.totalPending,
        }))} filename={`group-wise-${fy}`} />
      </div>
      {Object.keys(byGroup).length === 0 ? (
        <EmptyState title="No data" body="No client groups found." icon={<FileSpreadsheet className="h-6 w-6 text-zinc-400" />} />
      ) : (
        <div className="tff-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">Services</TableHead>
                <TableHead className="text-right">Tasks done</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(byGroup).map((g) => (
                <TableRow key={g.name}>
                  <TableCell className="font-medium text-zinc-900">{g.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.clientCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.serviceCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.tasksCompleted}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.totalFee > 0 ? `₹${g.totalFee.toLocaleString('en-IN')}` : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">{g.totalBilled > 0 ? `₹${g.totalBilled.toLocaleString('en-IN')}` : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-700">{g.totalPending > 0 ? `₹${g.totalPending.toLocaleString('en-IN')}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

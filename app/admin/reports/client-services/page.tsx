import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { formatDateIST } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';
import { FileSpreadsheet } from 'lucide-react';
import ClientServicesReportClient from './client-services-report-client';

export const dynamic = 'force-dynamic';

export default async function ClientServicesReportPage({ searchParams }: { searchParams: { client_id?: string; group_id?: string; fy?: string } }) {
  await requireRole('admin');
  const sb = createClient();

  const fy = searchParams.fy ? parseInt(searchParams.fy, 10) : new Date().getFullYear();
  const fyStart = `${fy}-04-01`;
  const fyEnd = `${fy + 1}-03-31`;

  // Base query for client-sub-services with joins
  let q = sb
    .from('client_sub_services')
    .select(`
      id,
      client_id,
      sub_service_id,
      fee_amount,
      is_active,
      clients!client_sub_services_client_id_fkey(id, business_name, group_id, client_groups!clients_group_id_fkey(name)),
      sub_services!client_sub_services_sub_service_id_fkey(name, code, services!sub_services_service_id_fkey(name))
    `)
    .eq('is_active', true);

  if (searchParams.client_id) {
    q = q.eq('client_id', searchParams.client_id);
  }

  const { data: cssRows } = await q.order('client_id');

  // Fetch tasks for the FY to compute billed/pending amounts and completed counts
  const { data: taskRows } = await sb
    .from('tasks')
    .select('sub_service_id, client_id, status, bill_amount, billed, completed_date')
    .eq('is_deleted', false)
    .gte('completed_date', fyStart)
    .lte('completed_date', fyEnd);

  // Fetch all clients and groups for filter dropdown
  const [{ data: allClients }, { data: allGroups }] = await Promise.all([
    sb.from('clients').select('id, business_name').eq('is_deleted', false).order('business_name'),
    sb.from('client_groups').select('id, name').order('name'),
  ]);

  // Build report rows
  const rows = (cssRows ?? []).map((row: any) => {
    const clientTasks = (taskRows ?? []).filter(
      (t: any) => t.client_id === row.client_id && t.sub_service_id === row.sub_service_id
    );
    const completed = clientTasks.filter((t: any) => t.status === 'completed').length;
    const billedAmt = clientTasks
      .filter((t: any) => t.billed && t.bill_amount)
      .reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);
    const pendingAmt = clientTasks
      .filter((t: any) => !t.billed && t.bill_amount)
      .reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);

    return {
      client_id: row.client_id,
      client_name: row.clients?.business_name ?? '—',
      group_name: row.clients?.client_groups?.name ?? '—',
      group_id: row.clients?.group_id,
      service_name: row.sub_services?.services?.name ?? '—',
      sub_service_name: row.sub_services?.name ?? '—',
      sub_service_code: row.sub_services?.code ?? '—',
      fee_amount: row.fee_amount,
      tasks_completed: completed,
      amount_billed: billedAmt,
      amount_pending: pendingAmt,
    };
  });

  // Apply group filter in memory since group is on clients table
  const filteredRows = searchParams.group_id
    ? rows.filter((r) => r.group_id === searchParams.group_id)
    : rows;

  const totalFee = filteredRows.reduce((s, r) => s + (r.fee_amount || 0), 0);
  const totalBilled = filteredRows.reduce((s, r) => s + r.amount_billed, 0);
  const totalPending = filteredRows.reduce((s, r) => s + r.amount_pending, 0);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Client services report</h1>
          <p className="tff-page-subtitle">Services provided, fees, and billing status by client for FY {fy}-{fy + 1}.</p>
        </div>
      </div>

      <ClientServicesReportClient
        fy={fy}
        clients={allClients ?? []}
        groups={allGroups ?? []}
        selectedClient={searchParams.client_id}
        selectedGroup={searchParams.group_id}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tff-card p-5">
          <div className="tff-kpi-value">₹{totalFee.toLocaleString('en-IN')}</div>
          <div className="tff-kpi-label mt-1">Total fees</div>
        </div>
        <div className="tff-card p-5">
          <div className="tff-kpi-value text-emerald-600">₹{totalBilled.toLocaleString('en-IN')}</div>
          <div className="tff-kpi-label mt-1">Billed</div>
        </div>
        <div className="tff-card p-5">
          <div className="tff-kpi-value text-amber-600">₹{totalPending.toLocaleString('en-IN')}</div>
          <div className="tff-kpi-label mt-1">Pending billing</div>
        </div>
      </div>

      <div className="flex justify-end">
        <ExportButton data={filteredRows.map((r) => ({
          client: r.client_name,
          group: r.group_name,
          service: r.service_name,
          'sub service': r.sub_service_name,
          fee: r.fee_amount ?? 0,
          'tasks done': r.tasks_completed,
          billed: r.amount_billed,
          pending: r.amount_pending,
        }))} filename={`client-services-${fy}`} />
      </div>
      {filteredRows.length === 0 ? (
        <EmptyState
          title="No data"
          body="No active client services match the selected filters."
          icon={<FileSpreadsheet className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Client</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sub-service</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Tasks done</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-zinc-900">{r.client_name}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{r.group_name}</TableCell>
                  <TableCell className="text-sm text-zinc-700">{r.service_name}</TableCell>
                  <TableCell className="text-sm text-zinc-700">{r.sub_service_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.fee_amount ? `₹${r.fee_amount.toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.tasks_completed}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">
                    {r.amount_billed > 0 ? `₹${r.amount_billed.toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-700">
                    {r.amount_pending > 0 ? `₹${r.amount_pending.toLocaleString('en-IN')}` : '—'}
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

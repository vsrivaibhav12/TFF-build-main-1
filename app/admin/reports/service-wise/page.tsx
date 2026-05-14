import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';
import { FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ServiceWiseReportPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requireRole('admin');
  const sb = createClient();

  const fy = searchParams.fy ? parseInt(searchParams.fy, 10) : new Date().getFullYear();
  const fyStart = `${fy}-04-01`;
  const fyEnd = `${fy + 1}-03-31`;

  const { data: cssRows } = await sb
    .from('client_sub_services')
    .select('sub_service_id, fee_amount, is_active, sub_services!client_sub_services_sub_service_id_fkey(name, code, services!sub_services_service_id_fkey(name))')
    .eq('is_active', true);

  const { data: taskRows } = await sb
    .from('tasks')
    .select('sub_service_id, status, bill_amount, billed, completed_date')
    .eq('is_deleted', false)
    .gte('completed_date', fyStart)
    .lte('completed_date', fyEnd);

  // Aggregate by service -> sub-service
  const byService: Record<string, {
    serviceName: string;
    subServices: Record<string, {
      name: string;
      code: string;
      clientCount: number;
      totalTasks: number;
      completedTasks: number;
      totalFee: number;
      totalBilled: number;
      totalPending: number;
    }>;
  }> = {};

  for (const row of cssRows ?? []) {
    const svcName = (row.sub_services as any)?.services?.name ?? 'Uncategorized';
    const ssName = (row.sub_services as any)?.name ?? '—';
    const ssCode = (row.sub_services as any)?.code ?? '—';
    const ssId = row.sub_service_id;

    if (!byService[svcName]) byService[svcName] = { serviceName: svcName, subServices: {} };
    if (!byService[svcName].subServices[ssId]) {
      byService[svcName].subServices[ssId] = {
        name: ssName, code: ssCode, clientCount: 0, totalTasks: 0, completedTasks: 0,
        totalFee: 0, totalBilled: 0, totalPending: 0,
      };
    }
    byService[svcName].subServices[ssId].clientCount++;
    byService[svcName].subServices[ssId].totalFee += row.fee_amount || 0;
  }

  for (const t of taskRows ?? []) {
    const ssId = t.sub_service_id;
    for (const svc of Object.values(byService)) {
      if (svc.subServices[ssId]) {
        svc.subServices[ssId].totalTasks++;
        if (t.status === 'completed') svc.subServices[ssId].completedTasks++;
        if (t.billed && t.bill_amount) svc.subServices[ssId].totalBilled += t.bill_amount;
        if (!t.billed && t.bill_amount) svc.subServices[ssId].totalPending += t.bill_amount;
      }
    }
  }

  const grandTotalFee = Object.values(byService).reduce((s, svc) => s + Object.values(svc.subServices).reduce((ss, ssRow) => ss + ssRow.totalFee, 0), 0);
  const grandTotalBilled = Object.values(byService).reduce((s, svc) => s + Object.values(svc.subServices).reduce((ss, ssRow) => ss + ssRow.totalBilled, 0), 0);
  const grandTotalPending = Object.values(byService).reduce((s, svc) => s + Object.values(svc.subServices).reduce((ss, ssRow) => ss + ssRow.totalPending, 0), 0);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Service-wise report</h1>
          <p className="tff-page-subtitle">Aggregated view by service and sub-service for FY {fy}-{fy + 1}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tff-card p-5"><div className="tff-kpi-value">₹{grandTotalFee.toLocaleString('en-IN')}</div><div className="tff-kpi-label mt-1">Total fees</div></div>
        <div className="tff-card p-5"><div className="tff-kpi-value text-emerald-600">₹{grandTotalBilled.toLocaleString('en-IN')}</div><div className="tff-kpi-label mt-1">Billed</div></div>
        <div className="tff-card p-5"><div className="tff-kpi-value text-amber-600">₹{grandTotalPending.toLocaleString('en-IN')}</div><div className="tff-kpi-label mt-1">Pending</div></div>
      </div>

      <div className="flex justify-end">
        <ExportButton data={Object.values(byService).flatMap((svc) => Object.values(svc.subServices).map((ss) => ({
          service: svc.serviceName,
          'sub service': ss.name,
          code: ss.code,
          clients: ss.clientCount,
          'tasks done': ss.completedTasks,
          fee: ss.totalFee,
          billed: ss.totalBilled,
          pending: ss.totalPending,
        })))} filename={`service-wise-${fy}`} />
      </div>
      {Object.keys(byService).length === 0 ? (
        <EmptyState title="No data" body="No active client services found." icon={<FileSpreadsheet className="h-6 w-6 text-zinc-400" />} />
      ) : (
        <div className="space-y-6">
          {Object.values(byService).map((svc) => (
            <div key={svc.serviceName} className="tff-card overflow-hidden">
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 font-semibold text-zinc-900">{svc.serviceName}</div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead>Sub-service</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                    <TableHead className="text-right">Tasks done</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(svc.subServices).map((ss) => (
                    <TableRow key={ss.code}>
                      <TableCell className="font-medium text-zinc-900">{ss.name} <span className="text-xs text-zinc-400 font-mono">({ss.code})</span></TableCell>
                      <TableCell className="text-right tabular-nums">{ss.clientCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{ss.completedTasks}</TableCell>
                      <TableCell className="text-right tabular-nums">{ss.totalFee > 0 ? `₹${ss.totalFee.toLocaleString('en-IN')}` : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">{ss.totalBilled > 0 ? `₹${ss.totalBilled.toLocaleString('en-IN')}` : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-700">{ss.totalPending > 0 ? `₹${ss.totalPending.toLocaleString('en-IN')}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { formatDateIST } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PendingBillingReportPage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: tasks } = await sb
    .from('tasks')
    .select('id, task_number, title, status, bill_amount, bill_reference, completed_date, client_id, clients!tasks_client_id_fkey(business_name), sub_services!tasks_sub_service_id_fkey(name, services!sub_services_service_id_fkey(name))')
    .eq('is_billable', true)
    .eq('billed', false)
    .eq('is_deleted', false)
    .order('completed_date', { ascending: false, nullsFirst: false })
    .limit(200);

  const totalPending = (tasks ?? []).reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);

  // Group by client for summary
  const byClient: Record<string, { name: string; count: number; amount: number }> = {};
  for (const t of tasks ?? []) {
    const clientName = (t.clients as any)?.business_name ?? '—';
    if (!byClient[clientName]) byClient[clientName] = { name: clientName, count: 0, amount: 0 };
    byClient[clientName].count++;
    byClient[clientName].amount += (t as any).bill_amount || 0;
  }

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Pending billing report</h1>
          <p className="tff-page-subtitle">Billable tasks where invoice has not yet been raised externally.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tff-card p-5">
          <div className="tff-kpi-value text-amber-600">{tasks?.length ?? 0}</div>
          <div className="tff-kpi-label mt-1">Tasks pending billing</div>
        </div>
        <div className="tff-card p-5">
          <div className="tff-kpi-value">₹{totalPending.toLocaleString('en-IN')}</div>
          <div className="tff-kpi-label mt-1">Total pending amount</div>
        </div>
        <div className="tff-card p-5">
          <div className="tff-kpi-value">{Object.keys(byClient).length}</div>
          <div className="tff-kpi-label mt-1">Clients with pending bills</div>
        </div>
      </div>

      <div className="flex justify-end">
        <ExportButton data={(tasks ?? []).map((t: any) => ({
          'task number': t.task_number ?? '—',
          title: t.title,
          client: (t.clients as any)?.business_name ?? '—',
          service: (t.sub_services as any)?.services?.name ?? '—',
          'sub service': (t.sub_services as any)?.name ?? '—',
          amount: t.bill_amount || 0,
          completed: t.completed_date ?? '—',
          status: t.status,
        }))} filename="pending-billing" />
      </div>
      {(!tasks || tasks.length === 0) ? (
        <EmptyState
          title="Nothing pending"
          body="All billable tasks have been marked as billed. Great work."
          icon={<AlertTriangle className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Task</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium text-zinc-900">{t.title}</div>
                    <div className="text-xs text-zinc-500 font-mono">{t.task_number ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-700">{(t.clients as any)?.business_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {(t.sub_services as any)?.services?.name ?? '—'} · {(t.sub_services as any)?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-zinc-900">
                    {(t as any).bill_amount ? `₹${(t as any).bill_amount.toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 tabular-nums">
                    {formatDateIST(t.completed_date) || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'completed' ? 'success' : 'warning'}>
                      {t.status.replace('_', ' ')}
                    </Badge>
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

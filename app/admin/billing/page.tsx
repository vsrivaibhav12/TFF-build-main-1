import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { formatDateIST } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import BillingActions from './billing-actions';
import { Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BillingTrackerPage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: tasks } = await sb
    .from('tasks')
    .select('id, task_number, title, status, bill_amount, bill_reference, billed, billed_date, completed_date, client_id, clients!tasks_client_id_fkey(business_name)')
    .eq('is_billable', true)
    .eq('is_deleted', false)
    .order('completed_date', { ascending: false })
    .limit(200);

  const pendingCount = (tasks ?? []).filter((t: any) => !t.billed).length;
  const totalAmount = (tasks ?? []).reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);
  const pendingAmount = (tasks ?? []).filter((t: any) => !t.billed).reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Billing tracker</h1>
          <p className="tff-page-subtitle">Track billable tasks and mark them as billed when invoices are raised externally.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tff-card p-5">
          <div className="tff-kpi-value">{tasks?.length ?? 0}</div>
          <div className="tff-kpi-label mt-1">Billable tasks</div>
        </div>
        <div className="tff-card p-5">
          <div className="tff-kpi-value text-amber-600">{pendingCount}</div>
          <div className="tff-kpi-label mt-1">Pending billing</div>
        </div>
        <div className="tff-card p-5">
          <div className="tff-kpi-value">₹{pendingAmount.toLocaleString('en-IN')}</div>
          <div className="tff-kpi-label mt-1">Pending amount</div>
        </div>
      </div>

      {(!tasks || tasks.length === 0) ? (
        <EmptyState
          title="No billable tasks yet"
          body="Tasks marked as billable will appear here. Use the task detail page or bulk create to set the billable flag."
          icon={<Receipt className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Task</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t: any) => (
                <TableRow key={t.id} className={t.billed ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="font-medium text-zinc-900">{t.title}</div>
                    <div className="text-xs text-zinc-500 font-mono">{t.task_number ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-700">{t.clients?.business_name ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium text-zinc-900">
                    {t.bill_amount ? `₹${t.bill_amount.toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {t.billed ? (
                      <Badge variant="success">Billed</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 tabular-nums">
                    {formatDateIST(t.completed_date) || '—'}
                  </TableCell>
                  <TableCell>
                    <BillingActions taskId={t.id} billed={t.billed} billReference={t.bill_reference} />
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

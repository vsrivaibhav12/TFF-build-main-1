import { requireRole } from '@/lib/auth/require-role';
import { listWorkDone } from '@/lib/repositories/work-done';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import WorkDoneForm from '@/app/team/work-done/work-done-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminWorkDonePage() {
  await requireRole('admin');
  const [logs, clients, tasks] = await Promise.all([
    listWorkDone({}),
    listAccessibleClients(),
    listTasks({ status: ['pending', 'in_progress'] }),
  ]);

  const totalMinutes = logs.reduce((acc, l) => acc + l.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="tff-page-title">Work done</h1>
        <p className="tff-page-subtitle">Track daily output and time spent on client tasks across the firm.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <WorkDoneForm clients={clients} tasks={tasks} />
          
          <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total logged (firm)</div>
            <div className="mt-2 text-4xl font-bold text-zinc-900">{totalHours}h</div>
            <div className="text-sm text-zinc-500 mt-1">across {logs.length} entries</div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Context</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{formatDateIST(l.date)}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{l.users_profile?.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate" title={l.description}>{l.description}</div>
                    </TableCell>
                    <TableCell>{l.minutes}m</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {l.clients?.business_name && (
                          <span className="text-[10px] text-zinc-500 uppercase">{l.clients.business_name}</span>
                        )}
                        {l.tasks?.title && (
                          <Badge variant="outline" className="text-[10px] py-0">{l.tasks.title}</Badge>
                        )}
                        {!l.clients && !l.tasks && <span className="text-zinc-400">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                      No work logged yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

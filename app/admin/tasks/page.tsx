import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import TasksTable from './tasks-table';
import EmptyState from '@/components/sophistication/empty-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';
import NewTaskDialog from '@/components/tasks/new-task-dialog';
import { listTeamUsers } from '@/lib/repositories/clients';

export const dynamic = 'force-dynamic';

export default async function AdminTasksPage() {
  await requireRole('admin');
  const sb = createClient();

  const [{ data: tasks }, { data: allClients }, team] = await Promise.all([
    sb
      .from('tasks')
      .select('id, task_number, title, status, priority, due_date, is_stuck, is_verified, clients(business_name), users_profile:assigned_to(full_name)')
      .eq('is_deleted', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(100),
    sb.from('clients').select('id, business_name').eq('is_deleted', false).order('business_name'),
    listTeamUsers(),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const total = tasks?.length ?? 0;
  const stuck = tasks?.filter((t: any) => t.is_stuck || t.priority === 'high').length ?? 0;
  const dueToday = tasks?.filter((t: any) => t.due_date === todayIso).length ?? 0;

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Tasks</h1>
          <p className="tff-page-subtitle">Operational oversight of active engagements and team workflows.</p>
        </div>
        <div className="flex items-center gap-2">
          <NewTaskDialog clients={(allClients ?? []) as any} team={team as any} triggerLabel="New task" triggerVariant="default" />
          <Link href="/admin/tasks/bulk-create">
            <Button variant="outline" size="sm"><Layers className="h-4 w-4 mr-1" /> Bulk create</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active" value={total} icon={<Briefcase className="h-4 w-4" />} tone="zinc" />
        <StatCard label="Stuck or high-priority" value={stuck} icon={<AlertTriangle className="h-4 w-4" />} tone="red" />
        <StatCard label="Due today" value={dueToday} icon={<Clock className="h-4 w-4" />} tone="amber" />
      </div>

      {(!tasks || tasks.length === 0) ? (
        <EmptyState
          title="No tasks yet"
          body="Create a task using the New task button above, or use Bulk create for multiple clients at once. Tasks are also auto-generated from recurring sub-services on the 1st of each month."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <TasksTable tasks={tasks as any} todayIso={todayIso} />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'zinc' | 'red' | 'amber' }) {
  const toneCls = tone === 'zinc' ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : tone === 'red' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600';
  return (
    <div className="tff-card p-5 flex items-center gap-4">
      <div className={cn('p-2.5 rounded-lg border', toneCls)}>{icon}</div>
      <div>
        <div className="tff-kpi-value">{value}</div>
        <div className="tff-kpi-label mt-1">{label}</div>
      </div>
    </div>
  );
}

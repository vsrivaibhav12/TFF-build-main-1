import Link from 'next/link';
import { listTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listSavedViews } from '@/lib/actions/saved-views';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import NewTaskDialog from '@/components/tasks/new-task-dialog';
import TasksTableClient from './tasks-table-client';
import { Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeamTasksList({ searchParams }: { searchParams: { status?: string; priority?: string } }) {
  const status = searchParams.status?.split(',').filter(Boolean) as any;
  const priority = searchParams.priority?.split(',').filter(Boolean) as any;
  const [tasks, clients, team, views] = await Promise.all([
    listTasks({ status }),
    listAccessibleClients(),
    listTeamUsers(),
    listSavedViews('team.tasks'),
  ]);
  const filteredTasks = priority?.length
    ? tasks.filter((t: any) => priority.includes(t.priority))
    : tasks;
  const filters: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'blocked', label: 'Awaiting client' },
    { value: 'stuck', label: 'Stuck' },
    { value: 'completed', label: 'Completed' },
  ];
  const priorityFilters: { value: string; label: string }[] = [
    { value: '', label: 'All priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="tff-page-title">Tasks</h1>
          <p className="tff-page-subtitle">{tasks.length} task{tasks.length === 1 ? '' : 's'} in this view.</p>
        </div>
        <NewTaskDialog clients={clients as any} team={team as any} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">{filters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/team/tasks?status=${f.value}${searchParams.priority ? `&priority=${searchParams.priority}` : ''}` : `/team/tasks${searchParams.priority ? `?priority=${searchParams.priority}` : ''}`}
            className={`rounded-md border px-3 py-1.5 text-xs ${(searchParams.status ?? '') === f.value ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
            data-testid={`filter-${f.value || 'all'}`}
          >{f.label}</Link>
        ))}</div>
        <div className="flex gap-1.5 flex-wrap">{priorityFilters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/team/tasks?priority=${f.value}${searchParams.status ? `&status=${searchParams.status}` : ''}` : `/team/tasks${searchParams.status ? `?status=${searchParams.status}` : ''}`}
            className={`rounded-md border px-3 py-1.5 text-xs ${(searchParams.priority ?? '') === f.value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
          >{f.label}</Link>
        ))}</div>
        <SavedViewsBar scope="team.tasks" views={views as any} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks here yet"
          body="Tasks are auto-created from sub-services on the 1st of every month, or you can add one manually now."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
          actionLabel="Add your first task"
          actionOnClick={() => {
            const btn = document.querySelector('[data-testid="new-task-trigger"]') as HTMLButtonElement;
            if (btn) btn.click();
          }}
        />
      ) : (
        <TasksTableClient tasks={filteredTasks as any} />
      )}
    </div>
  );
}

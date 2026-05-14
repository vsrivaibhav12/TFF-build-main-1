'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateIST, cn } from '@/lib/utils';
import {
  Search, Filter, AlertTriangle, Building2, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck,
} from 'lucide-react';

type Task = {
  id: string;
  task_number: string | null;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  is_stuck: boolean;
  is_verified?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string } | null;
};

export default function TasksTable({ tasks, todayIso }: { tasks: Task[]; todayIso: string }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      const id = (t.users_profile as any)?.full_name;
      if (id) map.set(id, id);
    }
    return Array.from(map.values()).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    let data = [...tasks];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.task_number ?? '').toLowerCase().includes(q) ||
        (t.clients as any)?.business_name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      data = data.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      data = data.filter((t) => t.priority === priorityFilter);
    }
    if (assigneeFilter !== 'all') {
      data = data.filter((t) => (t.users_profile as any)?.full_name === assigneeFilter);
    }
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof Task];
      let vb: any = b[sortKey as keyof Task];
      if (sortKey === 'client') {
        va = (a.clients as any)?.business_name ?? '';
        vb = (b.clients as any)?.business_name ?? '';
      }
      if (sortKey === 'owner') {
        va = (a.users_profile as any)?.full_name ?? '';
        vb = (b.users_profile as any)?.full_name ?? '';
      }
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [tasks, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  const statuses = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 h-9 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 w-60"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-2 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-9 px-2 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          >
            <option value="all">All assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-sm text-zinc-500">
          {filtered.length} of {tasks.length} tasks
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
              <TableHead className="cursor-pointer select-none w-24" onClick={() => toggleSort('task_number')}>
                <span className="flex items-center gap-1">Number <SortIcon col="task_number" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('title')}>
                <span className="flex items-center gap-1">Task <SortIcon col="title" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('owner')}>
                <span className="flex items-center gap-1">Owner <SortIcon col="owner" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                <span className="flex items-center gap-1">Due <SortIcon col="due_date" /></span>
              </TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const overdue = t.due_date && t.due_date < todayIso && t.status !== 'completed';
              return (
                <TableRow key={t.id} data-row>
                  <TableCell>
                    <span className="text-xs font-mono text-zinc-500">{t.task_number ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/tasks/${t.id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                      {t.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{(t.clients as any)?.business_name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(t.users_profile as any)?.full_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-semibold border border-teal-200">
                          {((t.users_profile as any).full_name as string).slice(0, 1)}
                        </div>
                        <span className="text-sm text-zinc-700">{(t.users_profile as any).full_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-sm tabular-nums', overdue ? 'text-red-600 font-medium' : 'text-zinc-700')}>
                      {t.due_date ? formatDateIST(t.due_date) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'warning' : 'outline'}>
                      {t.priority ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant={t.status === 'completed' ? 'success' : 'teal'}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                      {t.is_verified && (
                        <span className="text-[10px] font-medium text-teal-700 flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {t.is_stuck && (
                        <span className="text-[10px] font-medium text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Stuck
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/tasks/${t.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      aria-label="Open task"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

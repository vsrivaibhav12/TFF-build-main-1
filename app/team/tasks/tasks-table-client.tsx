'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST, cn } from '@/lib/utils';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { ShieldCheck } from 'lucide-react';

interface TaskRow {
  id: string;
  task_number: string | null;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  period_year?: number | null;
  period_month?: number | null;
  is_verified?: boolean;
  clients?: { business_name: string } | null;
}

export default function TasksTableClient({ tasks }: { tasks: TaskRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = tasks.length > 0 && selected.size === tasks.length;

  function toggle(id: string) {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(tasks.map((t) => t.id)));
  }

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" data-testid="task-select-all" /></TableHead>
              <TableHead className="w-24">Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{tasks.map((t) => (
            <TableRow key={t.id} className={selected.has(t.id) ? 'bg-teal-50/40' : ''}>
              <TableCell><Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select task ${t.title}`} data-testid={`task-select-${t.id}`} /></TableCell>
              <TableCell><span className="text-xs font-mono text-zinc-500">{t.task_number ?? '—'}</span></TableCell>
              <TableCell><Link href={`/team/tasks/${t.id}`} className="font-medium hover:text-teal-700">{t.title}</Link></TableCell>
              <TableCell>{t.clients?.business_name}</TableCell>
              <TableCell className="text-zinc-500">{t.period_month && t.period_year ? `${t.period_month}/${t.period_year}` : '—'}</TableCell>
              <TableCell>{formatDateIST(t.due_date)}</TableCell>
              <TableCell><Badge variant={t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'teal' : 'warning'}>{t.status.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="outline">{t.priority}</Badge></TableCell>
              <TableCell>
                {t.is_verified && (
                  <span className="text-[10px] font-medium text-teal-700 flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <BulkActionsBar ids={[...selected]} onClear={() => setSelected(new Set())} />
    </>
  );
}

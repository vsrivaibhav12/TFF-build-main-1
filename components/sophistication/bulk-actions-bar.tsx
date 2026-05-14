'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { transitionTaskAction } from '@/lib/actions/tasks';
import { updateClient } from '@/lib/actions/clients';
import { updateQueryStatusAction } from '@/lib/actions/queries';
import { toast } from 'sonner';
import { Trash2, CheckCircle2 } from 'lucide-react';

type EntityType = 'tasks' | 'clients' | 'queries';

export default function BulkActionsBar({ 
  ids, 
  onClear,
  entityType = 'tasks'
}: { 
  ids: string[]; 
  onClear: () => void;
  entityType?: EntityType;
}) {
  const [value, setValue] = useState<string>('');
  const [pending, startTransition] = useTransition();

  if (ids.length === 0) return null;

  async function handleApply() {
    if (!value) return;
    startTransition(async () => {
      let ok = 0, fail = 0;
      for (const id of ids) {
        let r;
        if (entityType === 'tasks') {
          r = await transitionTaskAction({ task_id: id, to_status: value as any });
        } else if (entityType === 'clients') {
          r = await updateClient({ id, lifecycle_stage: value as any });
        } else if (entityType === 'queries') {
          r = await updateQueryStatusAction({ query_id: id, status: value as any });
        }
        
        if (r?.success) ok++; else fail++;
      }
      toast[fail === 0 ? 'success' : 'warning'](`Updated ${ok} · failed ${fail}`);
      onClear();
    });
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="flex items-center gap-3 p-3 bg-zinc-900 text-white rounded-xl shadow-2xl border border-zinc-800" data-testid="bulk-bar">
        <div className="flex items-center gap-2 px-2 border-r border-zinc-700 mr-2">
          <CheckCircle2 className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-semibold">{ids.length} selected</span>
        </div>

        <div className="flex-1 flex items-center gap-2">
          {entityType === 'tasks' && (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="w-44 bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue placeholder="Set status…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}

          {entityType === 'clients' && (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="w-44 bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue placeholder="Set stage…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          )}

          {entityType === 'queries' && (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="w-48 bg-white border-zinc-300">
                <SelectValue placeholder="Change status…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Button 
          onClick={handleApply} 
          disabled={pending || !value} 
          className="bg-teal-600 hover:bg-teal-500 text-white"
          data-testid="bulk-apply"
        >
          {pending ? 'Applying…' : 'Apply'}
        </Button>
        
        <Button 
          onClick={onClear} 
          variant="ghost" 
          size="icon" 
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Clear selection"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

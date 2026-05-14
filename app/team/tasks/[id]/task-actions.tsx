'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { transitionTaskAction, addTaskNoteAction, assignTaskAction } from '@/lib/actions/tasks';
import { nextStatuses } from '@/lib/services/task-transitions';
import { Lock, RotateCcw } from 'lucide-react';

export default function TaskActions({ task, team }: { task: any; team: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [transitionTarget, setTransitionTarget] = useState('');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [reviewerId, setReviewerId] = useState(task.reviewer_id || '');

  const candidates = nextStatuses(task.status);
  const isClosed = task.status === 'completed' || task.status === 'cancelled';

  function doTransition() {
    if (!transitionTarget) return;
    startTransition(async () => {
      const r = await transitionTaskAction({ task_id: task.id, to_status: transitionTarget as any, note: note || undefined });
      if (!r.success) toast.error(r.error);
      else { toast.success(`Status updated to ${transitionTarget}`); setNote(''); setTransitionTarget(''); router.refresh(); }
    });
  }
  function addNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const r = await addTaskNoteAction({ task_id: task.id, body: note.trim() });
      if (!r.success) toast.error(r.error);
      else { toast.success('Note added'); setNote(''); router.refresh(); }
    });
  }
  function saveAssign() {
    startTransition(async () => {
      const r = await assignTaskAction({ task_id: task.id, assigned_to: assignedTo || null, reviewer_id: reviewerId || null });
      if (!r.success) toast.error(r.error);
      else { toast.success('Assignment updated'); router.refresh(); }
    });
  }

  if (isClosed) {
    return (
      <div className="rounded-xl border border-zinc-200 p-6 bg-zinc-50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center">
            <Lock className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <div className="font-semibold text-zinc-900">This task is {task.status}</div>
            <div className="text-sm text-zinc-500">Editing is locked. Reopen to make changes.</div>
          </div>
        </div>
        {candidates.includes('in_progress') && (
          <Button variant="outline" size="sm" onClick={() => {
            startTransition(async () => {
              const r = await transitionTaskAction({ task_id: task.id, to_status: 'in_progress' });
              if (!r.success) toast.error(r.error);
              else { toast.success('Task reopened'); router.refresh(); }
            });
          }} disabled={pending}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reopen task
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-6 bg-white space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Assignee</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}><SelectTrigger data-testid="assignee-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>{team.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Reviewer</Label>
          <Select value={reviewerId} onValueChange={setReviewerId}><SelectTrigger data-testid="reviewer-select"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>{team.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={saveAssign} disabled={pending} data-testid="save-assign">Save assignment</Button>

      {candidates.length > 0 && (
        <div className="border-t border-zinc-200 pt-5 space-y-3">
          <Label>Move to status</Label>
          <div className="flex gap-2">
            <Select value={transitionTarget} onValueChange={setTransitionTarget}>
              <SelectTrigger className="flex-1" data-testid="transition-select"><SelectValue placeholder="Choose next status…" /></SelectTrigger>
              <SelectContent>{candidates.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={doTransition} disabled={!transitionTarget || pending} data-testid="transition-submit">Apply</Button>
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (will be saved with the transition)" rows={2} data-testid="transition-note" />
        </div>
      )}

      <div className="border-t border-zinc-200 pt-5 space-y-3">
        <Label>Add note</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} data-testid="new-note" placeholder="Add an internal note…" />
        <Button variant="outline" size="sm" onClick={addNote} disabled={!note.trim() || pending}>Save note only</Button>
      </div>
    </div>
  );
}

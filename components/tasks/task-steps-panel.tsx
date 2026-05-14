'use client';
import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  toggleTaskStepAction, addAdHocTaskStepAction, updateTaskStepAction,
  deleteTaskStepAction, reorderTaskStepsAction,
} from '@/lib/actions/task-steps';
import { toast } from 'sonner';
import { Plus, ListChecks, Pencil, Trash2, GripVertical, Check, X, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react';
import { formatDateIST, cn } from '@/lib/utils';

interface Step {
  id: string;
  step_order: number;
  title: string;
  description?: string | null;
  is_required: boolean;
  completed_at: string | null;
  source_sop_step_id: string | null;
  users_profile?: { full_name: string } | null;
}

export default function TaskStepsPanel({ taskId, initial, editable = true }: { taskId: string; initial: Step[]; editable?: boolean }) {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [pending, startTransition] = useTransition();

  const completed = steps.filter((s) => s.completed_at).length;
  const total = steps.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  function toggle(s: Step) {
    const next = !s.completed_at;
    setSteps((arr) => arr.map((x) => x.id === s.id ? { ...x, completed_at: next ? new Date().toISOString() : null } : x));
    startTransition(async () => {
      const r = await toggleTaskStepAction({ step_id: s.id, task_id: taskId, completed: next });
      if (!r.success) {
        setSteps((arr) => arr.map((x) => x.id === s.id ? { ...x, completed_at: s.completed_at } : x));
        toast.error(r.error);
      }
    });
  }

  function addStep() {
    if (!draft.trim()) return;
    startTransition(async () => {
      const r = await addAdHocTaskStepAction({ task_id: taskId, title: draft.trim() });
      if (r.success) {
        toast.success('Step added');
        setSteps((arr) => [
          ...arr,
          { id: (r as any).data.id, step_order: arr.length + 1, title: draft.trim(), is_required: false, completed_at: null, source_sop_step_id: null },
        ]);
        setDraft('');
      } else toast.error(r.error);
    });
  }

  function startEdit(s: Step) {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditDesc(s.description ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  }

  function saveEdit(stepId: string) {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      const r = await updateTaskStepAction({ step_id: stepId, task_id: taskId, title: editTitle.trim(), description: editDesc.trim() || null });
      if (r.success) {
        toast.success('Step updated');
        setSteps((arr) => arr.map((s) => s.id === stepId ? { ...s, title: editTitle.trim(), description: editDesc.trim() || null } : s));
        cancelEdit();
      } else toast.error(r.error);
    });
  }

  function removeStep(stepId: string) {
    if (!confirm('Delete this step?')) return;
    startTransition(async () => {
      const r = await deleteTaskStepAction({ step_id: stepId, task_id: taskId });
      if (r.success) {
        toast.success('Step deleted');
        setSteps((arr) => arr.filter((s) => s.id !== stepId));
      } else toast.error(r.error);
    });
  }

  function moveStep(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const next = [...steps];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved);
    const reordered = next.map((s, i) => ({ ...s, step_order: i + 1 }));
    setSteps(reordered);
    startTransition(async () => {
      const r = await reorderTaskStepsAction({ task_id: taskId, step_ids: reordered.map((s) => s.id) });
      if (!r.success) {
        toast.error(r.error);
        setSteps(steps);
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4" data-testid="task-steps-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-teal-600" /> Checklist</h3>
          <button onClick={() => setShowHelp((v) => !v)} className="text-zinc-300 hover:text-zinc-500" title="How to use checklist">
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        <Badge variant={pct === 100 ? 'success' : 'outline'}>{completed} / {total} · {pct}%</Badge>
      </div>

      {showHelp && (
        <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
          <p><strong>Check</strong> a box to mark a step complete.</p>
          <p><strong>Arrows</strong> on the left reorder steps (up/down).</p>
          <p><strong>Pencil</strong> edits the step title and description.</p>
          <p><strong>Trash</strong> deletes a step permanently.</p>
          <p>Type in the box below and click <strong>Add</strong> to create new ad-hoc steps.</p>
        </div>
      )}

      {total > 0 && (
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {steps.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">No checklist for this task yet.</p>
          <p className="text-xs text-zinc-400">If this task is linked to a sub-service with an SOP, steps are auto-added when the task is created. Otherwise, add your own steps below.</p>
        </div>
      ) : (
        <ul className="space-y-2">{steps.map((s, idx) => {
          const done = !!s.completed_at;
          const isEditing = editingId === s.id;
          return (
            <li key={s.id} className={cn('flex items-start gap-2 rounded-lg border border-zinc-200 p-3', done && 'bg-teal-50/30 border-teal-200')}>
              {editable && (
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <button onClick={() => moveStep(idx, -1)} disabled={idx === 0 || pending} className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30" title="Move up"><ArrowUp className="h-3 w-3" /></button>
                  <GripVertical className="h-3 w-3 text-zinc-300" />
                  <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1 || pending} className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30" title="Move down"><ArrowDown className="h-3 w-3" /></button>
                </div>
              )}
              <Checkbox checked={done} onCheckedChange={() => toggle(s)} disabled={pending} data-testid={`step-${s.id}`} className="mt-1" />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Step title" className="text-sm" autoFocus />
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description (optional)" className="text-sm" />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => saveEdit(s.id)} disabled={pending || !editTitle.trim()}><Check className="h-3 w-3" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3 w-3" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={cn('text-sm font-medium', done && 'line-through text-zinc-500')}>{s.title}</div>
                    {s.description && <div className="text-xs text-zinc-500 mt-0.5">{s.description}</div>}
                    {done && (
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {s.users_profile?.full_name ?? 'someone'} · {formatDateIST(s.completed_at!)}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!s.source_sop_step_id && <Badge variant="outline" className="text-[9px]">ad-hoc</Badge>}
                {!s.is_required && <Badge variant="outline" className="text-[9px]">optional</Badge>}
                {editable && !isEditing && !done && (
                  <>
                    <button onClick={() => startEdit(s)} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700" title="Edit step"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => removeStep(s.id)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600" title="Delete step"><Trash2 className="h-3 w-3" /></button>
                  </>
                )}
              </div>
            </li>
          );
        })}</ul>
      )}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add ad-hoc step…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} data-testid="task-step-input" />
        <Button onClick={addStep} disabled={pending || !draft.trim()} size="sm" data-testid="task-step-add"><Plus className="h-3 w-3" /> Add</Button>
      </div>
    </div>
  );
}

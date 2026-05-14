'use client';
import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TaskTemplateDialog from './task-template-dialog';
import { upsertTaskTemplateStepAction, deleteTaskTemplateStepAction, reorderTaskTemplateStepsAction } from '@/lib/actions/task-templates';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Step {
  id: string;
  step_order: number;
  title: string;
  description?: string | null;
  is_required?: boolean;
  guidance_notes?: string | null;
}

interface Template {
  id: string;
  title: string;
  description?: string | null;
  estimated_days?: number | null;
  frequency: string;
  is_active: boolean;
}

interface Props {
  subService: any;
  templates: Template[];
  stepsByTemplate: Record<string, Step[]>;
}

export default function TaskTemplatePanel({ subService, templates, stepsByTemplate }: Props) {
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <div className="mt-3 text-xs text-zinc-400 italic">
        No task templates yet.{' '}
        <TaskTemplateDialog subServiceId={subService.id} subServiceName={subService.name}>
          <button className="text-teal-700 hover:underline">Create one</button>
        </TaskTemplateDialog>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Task templates</div>
      {templates.map((tmpl) => (
        <TemplateRow
          key={tmpl.id}
          subService={subService}
          template={tmpl}
          steps={stepsByTemplate[tmpl.id] ?? []}
          isOpen={openTemplateId === tmpl.id}
          onToggle={() => setOpenTemplateId((id) => (id === tmpl.id ? null : tmpl.id))}
        />
      ))}
      <TaskTemplateDialog subServiceId={subService.id} subServiceName={subService.name}>
        <button className="text-xs text-teal-700 hover:underline mt-1">+ New task template</button>
      </TaskTemplateDialog>
    </div>
  );
}

function TemplateRow({
  subService,
  template,
  steps,
  isOpen,
  onToggle,
}: {
  subService: any;
  template: Template;
  steps: Step[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [localSteps, setLocalSteps] = useState(steps);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftGuidance, setDraftGuidance] = useState('');
  const [pending, startTransition] = useTransition();

  function addStep() {
    if (!draftTitle.trim()) return;
    startTransition(async () => {
      const next_order = (localSteps[localSteps.length - 1]?.step_order ?? 0) + 1;
      const r = await upsertTaskTemplateStepAction({
        task_template_id: template.id,
        step_order: next_order,
        title: draftTitle.trim(),
        is_required: true,
        guidance_notes: draftGuidance || undefined,
      });
      if (r.success) {
        toast.success('Step added');
        setDraftTitle('');
        setDraftGuidance('');
        setLocalSteps((s) => [...s, { id: (r as any).data.id, step_order: next_order, title: draftTitle.trim(), is_required: true, guidance_notes: draftGuidance || null }]);
      } else toast.error(r.error);
    });
  }

  function removeStep(id: string) {
    startTransition(async () => {
      const r = await deleteTaskTemplateStepAction(id);
      if (r.success) { toast.success('Removed'); setLocalSteps((s) => s.filter((x) => x.id !== id)); }
      else toast.error(r.error);
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= localSteps.length) return;
    const reordered = [...localSteps];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setLocalSteps(reordered);
    startTransition(async () => {
      const r = await reorderTaskTemplateStepsAction({ task_template_id: template.id, ids_in_order: reordered.map((x) => x.id) });
      if (!r.success) { toast.error(r.error); setLocalSteps(steps); }
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between p-3">
        <button onClick={onToggle} className="flex items-center gap-2 text-left flex-1">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-sm font-medium">{template.title}</span>
          <span className="font-mono text-[10px] text-zinc-500">{template.frequency}</span>
          {template.estimated_days != null && <Badge variant="outline" className="text-[10px]">{template.estimated_days}d</Badge>}
          {!template.is_active && <Badge variant="warning">inactive</Badge>}
        </button>
        <TaskTemplateDialog subServiceId={subService.id} subServiceName={subService.name} initial={template}>
          <button className="text-xs text-teal-700 hover:underline ml-2">Edit</button>
        </TaskTemplateDialog>
      </div>
      {isOpen && (
        <div className="border-t border-zinc-200 px-3 py-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Steps</div>
          {localSteps.length === 0 && <div className="text-xs text-zinc-400 italic">No steps yet. Add the first one below.</div>}
          {localSteps.map((step, idx) => (
            <div key={step.id} className="flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
              <GripVertical className="h-3 w-3 text-zinc-300 mt-0.5" />
              <span className="text-xs font-mono text-zinc-400 w-5 mt-0.5">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{step.title}</div>
                {step.guidance_notes && <div className="text-xs text-zinc-500 mt-0.5">{step.guidance_notes}</div>}
              </div>
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 text-xs mt-0.5">↑</button>
              <button onClick={() => move(idx, 1)} disabled={idx === localSteps.length - 1} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 text-xs mt-0.5">↓</button>
              <button onClick={() => removeStep(step.id)} className="text-zinc-400 hover:text-red-600 mt-0.5"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="space-y-2 pt-1">
            <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Step title, e.g. Reconcile vendor invoices vs 2B" className="text-sm" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} />
            <Textarea value={draftGuidance} onChange={(e) => setDraftGuidance(e.target.value)} placeholder="Guidance notes for staff (optional)" rows={2} className="text-sm" />
            <Button onClick={addStep} disabled={pending || !draftTitle.trim()} size="sm"><Plus className="h-3 w-3" /> Add step</Button>
          </div>
        </div>
      )}
    </div>
  );
}

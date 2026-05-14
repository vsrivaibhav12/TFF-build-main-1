'use client';
import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SubServiceDialog from './sub-service-dialog';
import { upsertSopStepAction, deleteSopStepAction, reorderSopStepsAction } from '@/lib/actions/services-catalogue';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SubServicePanel({ subService, sopSteps }: { subService: any; sopSteps: any[] }) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(sopSteps);
  const [draftTitle, setDraftTitle] = useState('');
  const [pending, startTransition] = useTransition();

  function addStep() {
    if (!draftTitle.trim()) return;
    startTransition(async () => {
      const next_order = (steps[steps.length - 1]?.step_order ?? 0) + 1;
      const r = await upsertSopStepAction({ sub_service_id: subService.id, step_order: next_order, title: draftTitle.trim(), is_required: true });
      if (r.success) { toast.success('Step added'); setDraftTitle(''); setSteps((s) => [...s, { id: (r as any).data.id, step_order: next_order, title: draftTitle.trim(), is_required: true }]); }
      else toast.error(r.error);
    });
  }
  function removeStep(id: string) {
    startTransition(async () => {
      const r = await deleteSopStepAction(id);
      if (r.success) { toast.success('Removed'); setSteps((s) => s.filter((x) => x.id !== id)); }
      else toast.error(r.error);
    });
  }
  function move(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const reordered = [...steps];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setSteps(reordered);
    startTransition(async () => {
      const r = await reorderSopStepsAction({ sub_service_id: subService.id, ids_in_order: reordered.map((x) => x.id) });
      if (!r.success) { toast.error(r.error); setSteps(steps); }
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50">
      <div className="flex items-center justify-between p-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left" data-testid={`sub-${subService.code}-toggle`}>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-sm font-medium">{subService.name}</span>
          <span className="font-mono text-[10px] text-zinc-500">{subService.code}</span>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="teal">{subService.frequency}</Badge>
          <Badge variant="outline">{steps.length} step{steps.length === 1 ? '' : 's'}</Badge>
          {!subService.is_active && <Badge variant="warning">inactive</Badge>}
          <SubServiceDialog serviceId={subService.service_id} serviceName={subService.services?.name ?? ''} initial={subService}>
            <button className="text-xs text-teal-700 hover:underline">Edit</button>
          </SubServiceDialog>
        </div>
      </div>
      {open && (
        <div className="border-t border-zinc-200 px-3 py-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">SOP checklist</div>
          {steps.length === 0 && <div className="text-xs text-zinc-400 italic">No SOP steps yet. Add the first one below.</div>}
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2">
              <GripVertical className="h-3 w-3 text-zinc-300" />
              <span className="text-xs font-mono text-zinc-400 w-5">{idx + 1}.</span>
              <span className="text-sm flex-1">{step.title}</span>
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 text-xs">↑</button>
              <button onClick={() => move(idx, 1)} disabled={idx === steps.length - 1} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 text-xs">↓</button>
              <button onClick={() => removeStep(step.id)} className="text-zinc-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="e.g. Reconcile vendor invoices vs 2B" className="text-sm" data-testid={`sop-input-${subService.code}`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} />
            <Button onClick={addStep} disabled={pending || !draftTitle.trim()} size="sm" data-testid={`sop-add-${subService.code}`}><Plus className="h-3 w-3" /> Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { upsertTaskTemplateAction, deleteTaskTemplateAction } from '@/lib/actions/task-templates';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface Props {
  subServiceId: string;
  subServiceName: string;
  initial?: any;
  children: React.ReactNode;
}

export default function TaskTemplateDialog({ subServiceId, subServiceName, initial, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    id: initial?.id,
    sub_service_id: subServiceId,
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    frequency: initial?.frequency ?? 'monthly',
    due_day_of_month: initial?.due_day_of_month ?? null,
    estimated_days: initial?.estimated_days ?? null,
    is_active: initial?.is_active ?? true,
  });
  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }
  function save() {
    if (!f.title) { toast.error('Title is required'); return; }
    startTransition(async () => {
      const r = await upsertTaskTemplateAction(f as any);
      if (r.success) { toast.success('Saved'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  function remove() {
    if (!f.id || !confirm('Delete this task template?')) return;
    startTransition(async () => {
      const r = await deleteTaskTemplateAction(f.id!);
      if (r.success) { toast.success('Deleted'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{initial ? 'Edit task template' : `New task template — ${subServiceName}`}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Title *</Label><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Monthly GSTR-3B filing" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Frequency</Label>
              <Select value={f.frequency} onValueChange={(v) => set('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['monthly', 'quarterly', 'annually', 'on_demand'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Default due day</Label><Input type="number" min={1} max={31} value={f.due_day_of_month ?? ''} onChange={(e) => set('due_day_of_month', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 20" /></div>
          </div>
          <div className="space-y-2"><Label>Estimated days to complete</Label><Input type="number" min={1} value={f.estimated_days ?? ''} onChange={(e) => set('estimated_days', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 3" /></div>
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <div><Label>Active</Label><p className="text-xs text-zinc-500">Inactive templates don’t appear when creating tasks.</p></div>
            <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', !!v)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial && <Button variant="outline" onClick={remove} disabled={pending}><Trash2 className="h-4 w-4" /> Delete</Button>}
          <Button onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent></Dialog>
  );
}

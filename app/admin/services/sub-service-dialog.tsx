'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { upsertSubServiceAction, deleteSubServiceAction } from '@/lib/actions/services-catalogue';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function SubServiceDialog({ serviceId, serviceName, initial, children }: { serviceId: string; serviceName: string; initial?: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    id: initial?.id,
    service_id: serviceId,
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    description: initial?.description ?? '',
    frequency: initial?.frequency ?? 'monthly',
    due_day_of_month: initial?.due_day_of_month ?? null,
    is_recurring: initial?.is_recurring ?? true,
    requires_client_input: initial?.requires_client_input ?? true,
    requires_verification: initial?.requires_verification ?? false,
    is_active: initial?.is_active ?? true,
  });
  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }
  function save() {
    if (!f.name || !f.code) { toast.error('Name and code are required'); return; }
    startTransition(async () => {
      const r = await upsertSubServiceAction(f as any);
      if (r.success) { toast.success('Saved'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  function remove() {
    if (!f.id || !confirm('Disable this sub-service?')) return;
    startTransition(async () => {
      const r = await deleteSubServiceAction(f.id!);
      if (r.success) { toast.success('Disabled'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? `Edit sub-service — ${serviceName}` : `New sub-service in ${serviceName}`}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Name *</Label><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="GSTR-3B Filing" data-testid="sub-svc-name" /></div>
            <div className="space-y-2"><Label>Code *</Label><Input value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="GST_3B" /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Frequency</Label>
              <Select value={f.frequency} onValueChange={(v) => set('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['monthly', 'quarterly', 'annually', 'on_demand'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Default due day of month</Label><Input type="number" min={1} max={31} value={f.due_day_of_month ?? ''} onChange={(e) => set('due_day_of_month', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 20" /></div>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <div><Label>Recurring</Label><p className="text-xs text-zinc-500">Auto-generates a task every period.</p></div>
            <Switch checked={f.is_recurring} onCheckedChange={(v) => set('is_recurring', !!v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Needs client input</Label><p className="text-xs text-zinc-500">Adds an awaiting-client step in the workflow.</p></div>
            <Switch checked={f.requires_client_input} onCheckedChange={(v) => set('requires_client_input', !!v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Requires reviewer verification</Label><p className="text-xs text-zinc-500">When completed, mark as pending verification until a senior reviewer signs off. Internal-only — clients see &quot;Filed / Done&quot; immediately.</p></div>
            <Switch checked={f.requires_verification} onCheckedChange={(v) => set('requires_verification', !!v)} data-testid="ss-requires-verification" />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Active</Label><p className="text-xs text-zinc-500">Inactive sub-services don’t appear when assigning to clients.</p></div>
            <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', !!v)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial && <Button variant="outline" onClick={remove} disabled={pending}><Trash2 className="h-4 w-4" /> Disable</Button>}
          <Button onClick={save} disabled={pending} data-testid="sub-svc-save">{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent></Dialog>
  );
}

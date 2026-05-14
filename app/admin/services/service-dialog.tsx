'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { upsertServiceAction, deleteServiceAction } from '@/lib/actions/services-catalogue';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function ServiceDialog({ categories, initial, children }: { categories: { id: string; name: string }[]; initial?: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    id: initial?.id,
    category_id: initial?.category_id ?? '',
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    description: initial?.description ?? '',
    service_kind: initial?.service_kind ?? '',
  });
  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }
  function save() {
    if (!f.name || !f.code || !f.category_id) { toast.error('Name, code and category are required'); return; }
    startTransition(async () => {
      const r = await upsertServiceAction({ ...f, service_kind: (f.service_kind || null) as any });
      if (r.success) { toast.success('Saved'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  function remove() {
    if (!f.id || !confirm('Delete this service? Existing client assignments will be preserved.')) return;
    startTransition(async () => {
      const r = await deleteServiceAction(f.id!);
      if (r.success) { toast.success('Deleted'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? 'Edit service' : 'New service'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Category *</Label>
            <Select value={f.category_id} onValueChange={(v) => set('category_id', v)}>
              <SelectTrigger data-testid="svc-category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Name *</Label><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="GST Compliance" data-testid="svc-name" /></div>
          <div className="space-y-2"><Label>Code *</Label><Input value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="GST_COMPLIANCE" data-testid="svc-code" /><p className="text-xs text-zinc-500">Uppercase letters, digits and underscore only.</p></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="space-y-2"><Label>Service kind</Label>
            <Select value={f.service_kind || 'unset'} onValueChange={(v) => set('service_kind', v === 'unset' ? '' : v)}>
              <SelectTrigger data-testid="svc-kind"><SelectValue placeholder="Not set" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set (no module gating)</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="tds">TDS</SelectItem>
                <SelectItem value="income_tax">Income Tax</SelectItem>
                <SelectItem value="compliance">Compliance (general)</SelectItem>
                <SelectItem value="bizlens">BizLens (analytics)</SelectItem>
                <SelectItem value="vcfo">vCFO (advisory)</SelectItem>
                <SelectItem value="notice">Notice handling</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">Used to show/hide data-entry modules per client. Leave blank to disable gating for this service.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial && <Button variant="outline" onClick={remove} disabled={pending}><Trash2 className="h-4 w-4" /> Delete</Button>}
          <Button onClick={save} disabled={pending} data-testid="svc-save">{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent></Dialog>
  );
}

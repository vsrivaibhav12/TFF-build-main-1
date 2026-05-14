'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { upsertCredentialAction, deleteCredentialAction } from '@/lib/actions/credentials';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function CredentialDialog({ clients, initial, children }: { clients: { id: string; business_name: string }[]; initial?: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    id: initial?.id,
    client_id: initial?.client_id ?? '',
    portal_name: initial?.portal_name ?? '',
    portal_url: initial?.portal_url ?? '',
    username: initial?.username ?? '',
    password: '',
    security_question: initial?.security_question ?? '',
    security_answer: '',
    is_active: initial?.is_active ?? true,
  });
  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }
  function save() {
    startTransition(async () => {
      const r = await upsertCredentialAction(form as any);
      if (r.success) { toast.success('Saved'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  function remove() {
    if (!form.id || !confirm('Delete credential?')) return;
    startTransition(async () => {
      const r = await deleteCredentialAction(form.id!);
      if (r.success) { toast.success('Deleted'); setOpen(false); }
      else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? 'Edit credential' : 'New credential'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Client *</Label>
            <Select value={form.client_id} onValueChange={(v) => set('client_id', v)}>
              <SelectTrigger data-testid="cred-client"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Portal name *</Label><Input value={form.portal_name} onChange={(e) => set('portal_name', e.target.value)} placeholder="GST Portal" /></div>
          <div className="space-y-2"><Label>Portal URL</Label><Input value={form.portal_url} onChange={(e) => set('portal_url', e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => set('username', e.target.value)} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={initial ? '••• (leave blank to keep)' : ''} /></div>
          <div className="space-y-2"><Label>Security question</Label><Input value={form.security_question} onChange={(e) => set('security_question', e.target.value)} /></div>
          <div className="space-y-2"><Label>Security answer</Label><Input type="password" value={form.security_answer} onChange={(e) => set('security_answer', e.target.value)} placeholder={initial ? '••• (leave blank to keep)' : ''} /></div>
        </div>
        <DialogFooter className="gap-2">
          {initial && <Button variant="outline" onClick={remove} disabled={pending}><Trash2 className="h-4 w-4" /> Delete</Button>}
          <Button onClick={save} disabled={pending} data-testid="cred-save">{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

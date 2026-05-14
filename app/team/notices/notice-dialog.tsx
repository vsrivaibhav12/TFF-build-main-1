'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { upsertNoticeAction } from '@/lib/actions/notices';
import { toast } from 'sonner';

export default function NoticeDialog({ clients, initial, children }: { clients: any[]; initial?: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    id: initial?.id,
    client_id: initial?.client_id ?? '',
    notice_type: initial?.notice_type ?? 'GST',
    notice_number: initial?.notice_number ?? '',
    issuing_authority: initial?.issuing_authority ?? '',
    notice_received_date: initial?.notice_received_date ?? '',
    due_date: initial?.due_date ?? '',
    status: initial?.status ?? 'received',
    amount_involved: initial?.amount_involved ?? undefined,
    subject: initial?.subject ?? '',
    description: initial?.description ?? '',
  });
  function save() {
    startTransition(async () => {
      const r = await upsertNoticeAction(f as any);
      if (r.success) { toast.success('Saved'); setOpen(false); } else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{initial ? 'Edit notice' : 'New notice'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Client *</Label><Select value={f.client_id} onValueChange={(v) => setF({ ...f, client_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Type</Label><Select value={f.notice_type} onValueChange={(v) => setF({ ...f, notice_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GST">GST</SelectItem><SelectItem value="Income Tax">Income Tax</SelectItem><SelectItem value="TDS">TDS</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Notice number</Label><Input value={f.notice_number} onChange={(e) => setF({ ...f, notice_number: e.target.value })} /></div>
            <div className="space-y-2"><Label>Authority</Label><Input value={f.issuing_authority} onChange={(e) => setF({ ...f, issuing_authority: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Subject</Label><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Received</Label><Input type="date" value={f.notice_received_date} onChange={(e) => setF({ ...f, notice_received_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Due</Label><Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" value={f.amount_involved ?? ''} onChange={(e) => setF({ ...f, amount_involved: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div className="space-y-2"><Label>Status</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['received','reply_pending','reply_submitted','hearing_pending','hearing_held','order_pending','order_received','closed'].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={pending} data-testid="notice-save">{pending ? 'Saving…' : 'Save'}</Button></DialogFooter>
      </DialogContent></Dialog>
  );
}

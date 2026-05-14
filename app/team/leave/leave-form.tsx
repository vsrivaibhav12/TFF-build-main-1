'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { requestLeaveAction } from '@/lib/actions/leave';
import { toast } from 'sonner';

export default function LeaveForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ leave_type: 'paid' as const, from_date: '', to_date: '', reason: '' });
  function save() {
    if (!f.from_date || !f.to_date) { toast.error('Pick dates'); return; }
    startTransition(async () => {
      const r = await requestLeaveAction(f as any);
      if (r.success) { toast.success('Leave requested'); setOpen(false); } else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button data-testid="leave-new">Request leave</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Type</Label>
            <Select value={f.leave_type} onValueChange={(v) => setF({ ...f, leave_type: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['paid', 'sick', 'casual', 'comp', 'other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>From</Label><Input type="date" value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>To</Label><Input type="date" value={f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Reason</Label><Textarea rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={pending} data-testid="leave-submit">{pending ? 'Submitting…' : 'Submit'}</Button></DialogFooter>
      </DialogContent></Dialog>
  );
}

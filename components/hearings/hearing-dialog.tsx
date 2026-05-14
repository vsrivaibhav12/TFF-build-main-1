'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { createHearingAction } from '@/lib/actions/hearings';
import { toast } from 'sonner';
import { Plus, Gavel } from 'lucide-react';

interface Props {
  clients: { id: string; business_name: string }[];
  triggerLabel?: string;
}

export default function HearingDialog({ clients, triggerLabel = 'New hearing' }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    client_id: '',
    hearing_type: 'GST' as const,
    subject: '',
    hearing_scheduled_date: '',
    venue: '',
    officer_name: '',
    status: 'scheduled' as const,
  });

  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }

  function save() {
    if (!f.client_id) { toast.error('Pick a client'); return; }
    if (!f.subject.trim()) { toast.error('Subject is required'); return; }
    if (!f.hearing_scheduled_date) { toast.error('Scheduled date is required'); return; }
    startTransition(async () => {
      const r = await createHearingAction({
        client_id: f.client_id,
        hearing_type: f.hearing_type,
        subject: f.subject.trim(),
        hearing_scheduled_date: f.hearing_scheduled_date,
        venue: f.venue.trim() || null,
        officer_name: f.officer_name.trim() || null,
        status: f.status,
      });
      if (r.success) {
        toast.success('Hearing scheduled');
        setOpen(false);
        setF({ client_id: '', hearing_type: 'GST', subject: '', hearing_scheduled_date: '', venue: '', officer_name: '', status: 'scheduled' });
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm"><Plus className="h-4 w-4 mr-1" /> {triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-teal-600" /> Schedule hearing</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={f.client_id} onValueChange={(v) => set('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="Choose a client..." /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={f.hearing_type} onValueChange={(v) => set('hearing_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="Income Tax">Income Tax</SelectItem>
                  <SelectItem value="TDS">TDS</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => set('status', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="adjourned">Adjourned</SelectItem>
                  <SelectItem value="concluded">Concluded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={f.subject} onChange={(e) => set('subject', e.target.value)} placeholder="e.g. Show cause notice response hearing" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Scheduled date *</Label><Input type="date" value={f.hearing_scheduled_date} onChange={(e) => set('hearing_scheduled_date', e.target.value)} /></div>
            <div className="space-y-2"><Label>Officer name</Label><Input value={f.officer_name} onChange={(e) => set('officer_name', e.target.value)} placeholder="e.g. AC, GST" /></div>
          </div>
          <div className="space-y-2">
            <Label>Venue</Label>
            <Input value={f.venue} onChange={(e) => set('venue', e.target.value)} placeholder="e.g. GST Bhavan, Chennai" />
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={pending}>{pending ? 'Scheduling...' : 'Schedule hearing'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

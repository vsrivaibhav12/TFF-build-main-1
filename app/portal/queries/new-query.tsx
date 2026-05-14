'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createQueryAction } from '@/lib/actions/queries';

export default function NewQueryDialog({ clients }: { clients: { id: string; business_name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [client_id, setClientId] = useState(clients[0]?.id ?? '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  function submit() {
    if (!client_id || !subject || !description) return;
    startTransition(async () => {
      const r = await createQueryAction({ client_id, subject, description, priority });
      if (!r.success) toast.error(r.error);
      else { toast.success('Query raised'); setOpen(false); setSubject(''); setDescription(''); router.push(`/portal/queries/${(r as any).data.id}`); router.refresh(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button data-testid="new-query-btn"><Plus className="h-4 w-4" /> Raise query</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Raise a new query</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {clients.length > 1 && (
            <div><Label>For client</Label><Select value={client_id} onValueChange={setClientId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="query-subject" /></div>
          <div><Label>Details</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} data-testid="query-description" /></div>
          <div><Label>Priority</Label><Select value={priority} onValueChange={(v) => setPriority(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending || !subject || !description} data-testid="query-submit">Send</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

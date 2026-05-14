'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { runPayrollAction } from '@/lib/actions/payroll';
import { toast } from 'sonner';

export default function PayrollRunForm({ team }: { team: any[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const [f, setF] = useState({ user_id: '', year: now.getFullYear(), month: now.getMonth() + 1 });
  function run() {
    startTransition(async () => {
      const r = await runPayrollAction(f);
      if (r.success) { toast.success('Payroll computed'); setOpen(false); } else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button data-testid="payroll-run">Run payroll</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Run monthly payroll</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Team member *</Label>
            <Select value={f.user_id} onValueChange={(v) => setF({ ...f, user_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select member…" /></SelectTrigger>
              <SelectContent>{team.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Year</Label><Input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Month</Label><Input type="number" min={1} max={12} value={f.month} onChange={(e) => setF({ ...f, month: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={run} disabled={pending} data-testid="payroll-go">{pending ? 'Running…' : 'Compute & save'}</Button></DialogFooter>
      </DialogContent></Dialog>
  );
}

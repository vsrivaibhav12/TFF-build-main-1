'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveProjectionAction } from '@/lib/actions/projection';

export default function ProjectionForm({
  clientId,
  clientName,
  existing,
}: {
  clientId: string;
  clientName: string;
  existing: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const fy = new Date().getFullYear();

  const [form, setForm] = useState({
    gross_income: existing?.raw_value ?? '',
    tax: existing?.narrative ? parseTaxFromNarrative(existing.narrative) : '',
    tds_paid: existing?.benchmark_value ?? '',
    notes: existing?.recommended_action ?? '',
  });

  function parseTaxFromNarrative(narrative: string): number {
    const match = narrative.match(/tax\s*₹?([\d,]+)/i);
    return match ? Number(match[1].replace(/,/g, '')) : 0;
  }

  function submit() {
    const gross = Number(form.gross_income);
    const tax = Number(form.tax);
    const tds = Number(form.tds_paid);
    if (!gross || gross < 0) {
      toast.error('Enter a valid gross income');
      return;
    }
    startTransition(async () => {
      const r = await saveProjectionAction({
        client_id: clientId,
        fy_ending_year: fy,
        gross_income: gross,
        tax: tax || 0,
        tds_paid: tds || 0,
        notes: form.notes || undefined,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success('Projection saved');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          {existing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Update' : 'New'} tax projection — {clientName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label> FY ending year</Label>
              <Input type="number" value={fy} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Gross income ₹</Label>
              <Input type="number" value={form.gross_income} onChange={(e) => setForm({ ...form, gross_income: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Projected tax ₹</Label>
              <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>TDS paid ₹</Label>
              <Input type="number" value={form.tds_paid} onChange={(e) => setForm({ ...form, tds_paid: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Includes salary + rental income" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : 'Save projection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { upsertGstFilingAction } from '@/lib/actions/compliance';

export default function GstEntryForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    return_type: 'GSTR-3B',
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    status: 'not_started',
    taxable_turnover: '',
    output_tax_total: '',
    itc_claimed: '',
    net_tax_payable: '',
    filed_date: '',
    ack_number: '',
    change_reason: '',
  });

  function submit() {
    startTransition(async () => {
      const r = await upsertGstFilingAction({
        client_id: clientId,
        return_type: f.return_type as any,
        period_year: Number(f.period_year),
        period_month: Number(f.period_month),
        status: f.status as any,
        taxable_turnover: f.taxable_turnover ? Number(f.taxable_turnover) : null,
        output_tax_total: f.output_tax_total ? Number(f.output_tax_total) : null,
        itc_claimed: f.itc_claimed ? Number(f.itc_claimed) : null,
        net_tax_payable: f.net_tax_payable ? Number(f.net_tax_payable) : null,
        filed_date: f.filed_date || null,
        ack_number: f.ack_number || null,
        change_reason: f.change_reason || null,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success('GST filing saved');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> New GST</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New GST filing — {clientName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Type</Label><Select value={f.return_type} onValueChange={(v) => setF({ ...f, return_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['GSTR-1', 'GSTR-3B', 'GSTR-9'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Status</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['not_started', 'data_received', 'in_progress', 'review', 'filed'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Period month</Label><Input type="number" min={1} max={12} value={f.period_month} onChange={(e) => setF({ ...f, period_month: e.target.valueAsNumber })} /></div>
          <div><Label>Period year</Label><Input type="number" value={f.period_year} onChange={(e) => setF({ ...f, period_year: e.target.valueAsNumber })} /></div>
          <div><Label>Taxable turnover ₹</Label><Input value={f.taxable_turnover} onChange={(e) => setF({ ...f, taxable_turnover: e.target.value })} /></div>
          <div><Label>Output tax ₹</Label><Input value={f.output_tax_total} onChange={(e) => setF({ ...f, output_tax_total: e.target.value })} /></div>
          <div><Label>ITC claimed ₹</Label><Input value={f.itc_claimed} onChange={(e) => setF({ ...f, itc_claimed: e.target.value })} /></div>
          <div><Label>Net tax payable ₹</Label><Input value={f.net_tax_payable} onChange={(e) => setF({ ...f, net_tax_payable: e.target.value })} /></div>
          <div><Label>Filed on</Label><Input type="date" value={f.filed_date} onChange={(e) => setF({ ...f, filed_date: e.target.value })} /></div>
          <div><Label>Ack #</Label><Input value={f.ack_number} onChange={(e) => setF({ ...f, ack_number: e.target.value })} /></div>
          <div className="col-span-2"><Label>Change reason (if revising)</Label><Input value={f.change_reason} onChange={(e) => setF({ ...f, change_reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending} data-testid="submit-gst">{pending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : 'Save'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

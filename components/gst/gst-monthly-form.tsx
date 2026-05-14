'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { upsertGstMonthlyDataAction } from '@/lib/actions/gst-monthly';

interface Props {
  clients: { id: string; business_name: string }[];
}

export default function GstMonthlyForm({ clients }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const [f, setF] = useState({
    client_id: '',
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    turnover_taxable: '', turnover_exempt: '', turnover_nil_rated: '', turnover_zero_rated: '',
    output_cgst: '', output_sgst: '', output_igst: '', output_cess: '',
    input_2b_cgst: '', input_2b_sgst: '', input_2b_igst: '', input_2b_cess: '',
    input_books_cgst: '', input_books_sgst: '', input_books_igst: '', input_books_cess: '',
    tax_paid_cash_cgst: '', tax_paid_cash_sgst: '', tax_paid_cash_igst: '', tax_paid_cash_cess: '',
    carry_forward_itc: '', vendor_filing_percent: '', notes: '',
  });

  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }
  function num(k: keyof typeof f) { const v = parseFloat(f[k] as string); return isNaN(v) ? 0 : v; }

  function submit() {
    if (!f.client_id) { toast.error('Select a client'); return; }
    startTransition(async () => {
      const r = await upsertGstMonthlyDataAction({
        client_id: f.client_id,
        period_month: f.period_month,
        period_year: f.period_year,
        turnover_taxable: num('turnover_taxable'),
        turnover_exempt: num('turnover_exempt'),
        turnover_nil_rated: num('turnover_nil_rated'),
        turnover_zero_rated: num('turnover_zero_rated'),
        output_cgst: num('output_cgst'),
        output_sgst: num('output_sgst'),
        output_igst: num('output_igst'),
        output_cess: num('output_cess'),
        input_2b_cgst: num('input_2b_cgst'),
        input_2b_sgst: num('input_2b_sgst'),
        input_2b_igst: num('input_2b_igst'),
        input_2b_cess: num('input_2b_cess'),
        input_books_cgst: num('input_books_cgst'),
        input_books_sgst: num('input_books_sgst'),
        input_books_igst: num('input_books_igst'),
        input_books_cess: num('input_books_cess'),
        tax_paid_cash_cgst: num('tax_paid_cash_cgst'),
        tax_paid_cash_sgst: num('tax_paid_cash_sgst'),
        tax_paid_cash_igst: num('tax_paid_cash_igst'),
        tax_paid_cash_cess: num('tax_paid_cash_cess'),
        carry_forward_itc: num('carry_forward_itc'),
        vendor_filing_percent: num('vendor_filing_percent'),
        notes: f.notes.trim() || null,
      });
      if (r.success) {
        toast.success('GST monthly data saved');
        setOpen(false);
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm"><Plus className="h-4 w-4 mr-1" /> Enter monthly data</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-teal-600" /> GST monthly data entry</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Client *</Label>
              <Select value={f.client_id} onValueChange={(v) => set('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Month *</Label><Input type="number" min={1} max={12} value={f.period_month} onChange={(e) => set('period_month', parseInt(e.target.value))} /></div>
            <div className="space-y-1"><Label>Year *</Label><Input type="number" value={f.period_year} onChange={(e) => set('period_year', parseInt(e.target.value))} /></div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700">Turnover</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1"><Label className="text-xs">Taxable</Label><Input value={f.turnover_taxable} onChange={(e) => set('turnover_taxable', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">Exempt</Label><Input value={f.turnover_exempt} onChange={(e) => set('turnover_exempt', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">Nil-rated</Label><Input value={f.turnover_nil_rated} onChange={(e) => set('turnover_nil_rated', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">Zero-rated</Label><Input value={f.turnover_zero_rated} onChange={(e) => set('turnover_zero_rated', e.target.value)} placeholder="0" /></div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700">Output tax</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1"><Label className="text-xs">CGST</Label><Input value={f.output_cgst} onChange={(e) => set('output_cgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">SGST</Label><Input value={f.output_sgst} onChange={(e) => set('output_sgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">IGST</Label><Input value={f.output_igst} onChange={(e) => set('output_igst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">CESS</Label><Input value={f.output_cess} onChange={(e) => set('output_cess', e.target.value)} placeholder="0" /></div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700">Input tax credit — as per 2B</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1"><Label className="text-xs">CGST</Label><Input value={f.input_2b_cgst} onChange={(e) => set('input_2b_cgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">SGST</Label><Input value={f.input_2b_sgst} onChange={(e) => set('input_2b_sgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">IGST</Label><Input value={f.input_2b_igst} onChange={(e) => set('input_2b_igst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">CESS</Label><Input value={f.input_2b_cess} onChange={(e) => set('input_2b_cess', e.target.value)} placeholder="0" /></div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700">Input tax credit — as per books</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1"><Label className="text-xs">CGST</Label><Input value={f.input_books_cgst} onChange={(e) => set('input_books_cgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">SGST</Label><Input value={f.input_books_sgst} onChange={(e) => set('input_books_sgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">IGST</Label><Input value={f.input_books_igst} onChange={(e) => set('input_books_igst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">CESS</Label><Input value={f.input_books_cess} onChange={(e) => set('input_books_cess', e.target.value)} placeholder="0" /></div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700">Tax paid in cash</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1"><Label className="text-xs">CGST</Label><Input value={f.tax_paid_cash_cgst} onChange={(e) => set('tax_paid_cash_cgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">SGST</Label><Input value={f.tax_paid_cash_sgst} onChange={(e) => set('tax_paid_cash_sgst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">IGST</Label><Input value={f.tax_paid_cash_igst} onChange={(e) => set('tax_paid_cash_igst', e.target.value)} placeholder="0" /></div>
              <div className="space-y-1"><Label className="text-xs">CESS</Label><Input value={f.tax_paid_cash_cess} onChange={(e) => set('tax_paid_cash_cess', e.target.value)} placeholder="0" /></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Carry forward ITC</Label><Input value={f.carry_forward_itc} onChange={(e) => set('carry_forward_itc', e.target.value)} placeholder="0" /></div>
            <div className="space-y-1"><Label>Vendor filing %</Label><Input type="number" min={0} max={100} value={f.vendor_filing_percent} onChange={(e) => set('vendor_filing_percent', e.target.value)} placeholder="0" /></div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <textarea className="w-full rounded-md border border-zinc-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any observations or discrepancies…" />
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? 'Saving…' : 'Save monthly data'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

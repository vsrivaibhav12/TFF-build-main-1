'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, FileX } from 'lucide-react';
import { toast } from 'sonner';
import { upsertGstFilingAction, upsertTdsFilingAction, upsertItFilingAction } from '@/lib/actions/compliance';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';

export default function ComplianceEntry({ clientId, gst, tds, it }: { clientId: string; gst: any[]; tds: any[]; it: any[] }) {
  return (
    <div className="space-y-8">
      <Section title="GST filings" rows={gst} render={(r: any) => `${r.return_type} · ${r.period_month}/${r.period_year}`} status={(r: any) => r.status} extra={(r: any) => r.taxable_turnover ? formatCurrencyINR(Number(r.taxable_turnover), { compact: true }) : '—'} entry={<GstEntry clientId={clientId} />} />
      <Section title="TDS filings" rows={tds} render={(r: any) => `Q${r.period_quarter} ${r.period_year}`} status={(r: any) => r.status} extra={(r: any) => r.tax_deposited ? formatCurrencyINR(Number(r.tax_deposited), { compact: true }) : '—'} entry={<TdsEntry clientId={clientId} />} />
      <Section title="Income tax" rows={it} render={(r: any) => `FY ${r.fy_ending_year - 1}-${r.fy_ending_year}`} status={(r: any) => r.status} extra={(r: any) => r.tax_liability ? formatCurrencyINR(Number(r.tax_liability), { compact: true }) : '—'} entry={<ItEntry clientId={clientId} />} />
    </div>
  );
}

function Section({ title, rows, render, status, extra, entry }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{title} <span className="text-zinc-400 font-normal">({rows.length})</span></h3>
        {entry}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
          <FileX className="h-5 w-5 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No filings recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white divide-y">{rows.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between p-4"><div><div className="font-medium text-sm">{render(r)}</div><div className="text-xs text-zinc-500">filed {formatDateIST(r.filed_date)} · ack {r.ack_number || '—'}</div></div><div className="flex items-center gap-3"><span className="text-xs text-zinc-500">{extra(r)}</span><Badge variant={status(r) === 'filed' ? 'success' : 'warning'}>{status(r)}</Badge></div></div>
        ))}</div>
      )}
    </div>
  );
}

function GstEntry({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ return_type: 'GSTR-3B', period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1, status: 'not_started', taxable_turnover: '', output_tax_total: '', itc_claimed: '', net_tax_payable: '', filed_date: '', ack_number: '', change_reason: '' });
  function submit() {
    startTransition(async () => {
      const r = await upsertGstFilingAction({
        client_id: clientId,
        return_type: f.return_type as any,
        period_year: Number(f.period_year), period_month: Number(f.period_month),
        status: f.status as any,
        taxable_turnover: f.taxable_turnover ? Number(f.taxable_turnover) : null,
        output_tax_total: f.output_tax_total ? Number(f.output_tax_total) : null,
        itc_claimed: f.itc_claimed ? Number(f.itc_claimed) : null,
        net_tax_payable: f.net_tax_payable ? Number(f.net_tax_payable) : null,
        filed_date: f.filed_date || null, ack_number: f.ack_number || null, change_reason: f.change_reason || null,
      });
      if (!r.success) toast.error(r.error); else { toast.success('GST filing saved'); setOpen(false); router.refresh(); }
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" data-testid="new-gst-btn"><Plus className="h-4 w-4" /> New GST</Button></DialogTrigger>
      <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New GST filing</DialogTitle></DialogHeader>
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
        <DialogFooter><Button onClick={submit} disabled={pending} data-testid="submit-gst">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function TdsEntry({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false); const router = useRouter(); const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ period_quarter: 1, period_year: new Date().getFullYear(), status: 'not_started', total_deductions: '', tax_deposited: '', deductee_count: '', filed_date: '', ack_number: '', change_reason: '' });
  function submit() { startTransition(async () => {
    const r = await upsertTdsFilingAction({ client_id: clientId, period_quarter: Number(f.period_quarter), period_year: Number(f.period_year), status: f.status as any, total_deductions: f.total_deductions ? Number(f.total_deductions) : null, tax_deposited: f.tax_deposited ? Number(f.tax_deposited) : null, deductee_count: f.deductee_count ? Number(f.deductee_count) : null, filed_date: f.filed_date || null, ack_number: f.ack_number || null, change_reason: f.change_reason || null });
    if (!r.success) toast.error(r.error); else { toast.success('TDS filing saved'); setOpen(false); router.refresh(); }
  }); }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" /> New TDS</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>New TDS filing</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Quarter</Label><Select value={String(f.period_quarter)} onValueChange={(v) => setF({ ...f, period_quarter: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4].map(x => <SelectItem key={x} value={String(x)}>{`Q${x}`}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Year</Label><Input type="number" value={f.period_year} onChange={(e) => setF({ ...f, period_year: e.target.valueAsNumber })} /></div>
          <div><Label>Status</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['not_started', 'data_received', 'in_progress', 'review', 'filed'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Total deductions ₹</Label><Input value={f.total_deductions} onChange={(e) => setF({ ...f, total_deductions: e.target.value })} /></div>
          <div><Label>Tax deposited ₹</Label><Input value={f.tax_deposited} onChange={(e) => setF({ ...f, tax_deposited: e.target.value })} /></div>
          <div><Label>Deductee count</Label><Input value={f.deductee_count} onChange={(e) => setF({ ...f, deductee_count: e.target.value })} /></div>
          <div><Label>Filed on</Label><Input type="date" value={f.filed_date} onChange={(e) => setF({ ...f, filed_date: e.target.value })} /></div>
          <div><Label>Ack #</Label><Input value={f.ack_number} onChange={(e) => setF({ ...f, ack_number: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function ItEntry({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false); const router = useRouter(); const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ fy_ending_year: new Date().getFullYear(), status: 'not_started', gross_income: '', taxable_income: '', tax_liability: '', refund_amount: '', filed_date: '', ack_number: '', change_reason: '' });
  function submit() { startTransition(async () => {
    const r = await upsertItFilingAction({ client_id: clientId, fy_ending_year: Number(f.fy_ending_year), status: f.status as any, gross_income: f.gross_income ? Number(f.gross_income) : null, taxable_income: f.taxable_income ? Number(f.taxable_income) : null, tax_liability: f.tax_liability ? Number(f.tax_liability) : null, refund_amount: f.refund_amount ? Number(f.refund_amount) : null, filed_date: f.filed_date || null, ack_number: f.ack_number || null, change_reason: f.change_reason || null });
    if (!r.success) toast.error(r.error); else { toast.success('IT filing saved'); setOpen(false); router.refresh(); }
  }); }
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" /> New ITR</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>New IT filing</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>FY ending year</Label><Input type="number" value={f.fy_ending_year} onChange={(e) => setF({ ...f, fy_ending_year: e.target.valueAsNumber })} /></div>
          <div><Label>Status</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['not_started', 'data_received', 'in_progress', 'review', 'filed'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Gross income ₹</Label><Input value={f.gross_income} onChange={(e) => setF({ ...f, gross_income: e.target.value })} /></div>
          <div><Label>Taxable income ₹</Label><Input value={f.taxable_income} onChange={(e) => setF({ ...f, taxable_income: e.target.value })} /></div>
          <div><Label>Tax liability ₹</Label><Input value={f.tax_liability} onChange={(e) => setF({ ...f, tax_liability: e.target.value })} /></div>
          <div><Label>Refund ₹</Label><Input value={f.refund_amount} onChange={(e) => setF({ ...f, refund_amount: e.target.value })} /></div>
          <div><Label>Filed on</Label><Input type="date" value={f.filed_date} onChange={(e) => setF({ ...f, filed_date: e.target.value })} /></div>
          <div><Label>Ack #</Label><Input value={f.ack_number} onChange={(e) => setF({ ...f, ack_number: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, TrendingUp } from 'lucide-react';
import { upsertBizlensSnapshotAction, deleteBizlensSnapshotAction } from '@/lib/actions/bizlens-snapshots';

interface Snapshot {
  id?: string;
  period_month: number;
  period_year: number;
  months_covered: number;
  data: Record<string, number>;
}

interface Props {
  clientId: string;
  snapshots: Snapshot[];
}

const FIELDS = [
  { key: 'sales_revenue', label: 'Sales Revenue' },
  { key: 'variable_costs', label: 'Variable Costs' },
  { key: 'fixed_costs', label: 'Fixed Costs' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'interest_expense', label: 'Interest Expense' },
  { key: 'other_income', label: 'Other Income' },
  { key: 'bs_cash', label: 'Cash' },
  { key: 'bs_inventory', label: 'Inventory' },
  { key: 'bs_accounts_receivable', label: 'AR' },
  { key: 'bs_accounts_payable', label: 'AP' },
  { key: 'bs_short_term_borrowings', label: 'ST Borrowings' },
  { key: 'bs_long_term_borrowings', label: 'LT Borrowings' },
  { key: 'bs_equity', label: 'Equity' },
];

function emptySnapshot(): Snapshot {
  const now = new Date();
  return {
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    months_covered: 12,
    data: {},
  };
}

export default function PriorPeriodsPanel({ clientId, snapshots: initial }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(initial);
  const [editing, setEditing] = useState<Snapshot | null>(null);
  const [pending, startTransition] = useTransition();

  function setField(key: string, value: string) {
    if (!editing) return;
    const num = value === '' ? 0 : Number(value);
    setEditing({ ...editing, data: { ...editing.data, [key]: num } });
  }

  function save() {
    if (!editing) return;
    startTransition(async () => {
      const r = await upsertBizlensSnapshotAction({
        client_id: clientId,
        period_month: editing.period_month,
        period_year: editing.period_year,
        months_covered: editing.months_covered,
        data: editing.data,
      });
      if (r.success) {
        toast.success('Snapshot saved');
        setEditing(null);
        // Refresh list by updating local state
        const existing = snapshots.find(s => s.period_month === editing.period_month && s.period_year === editing.period_year);
        if (existing) {
          setSnapshots(snapshots.map(s => s === existing ? { ...editing, id: existing.id } : s));
        } else {
          setSnapshots([...snapshots, editing]);
        }
      } else {
        toast.error(r.error);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteBizlensSnapshotAction(id);
      if (r.success) {
        toast.success('Snapshot deleted');
        setSnapshots(snapshots.filter(s => s.id !== id));
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="tff-section-title">Prior period snapshots</h3>
          <p className="text-sm text-zinc-500">Add historical data to enable trend analysis and projections.</p>
        </div>
        <Button size="sm" onClick={() => setEditing(emptySnapshot())} disabled={pending}>
          <Plus className="h-4 w-4 mr-1" /> Add period
        </Button>
      </div>

      {snapshots.length === 0 && !editing && (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
          <TrendingUp className="h-8 w-8 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">No prior periods recorded yet.</p>
          <p className="text-xs text-zinc-400 mt-1">Add at least 2 periods for trend charts.</p>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((s) => (
            <Card key={`${s.period_year}-${s.period_month}`} className="border border-zinc-200 rounded-xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">{s.period_month.toString().padStart(2, '0')}/{s.period_year}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing({ ...s })}>
                    <span className="text-xs text-teal-600 font-medium">Edit</span>
                  </Button>
                  {s.id && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove(s.id!)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {FIELDS.slice(0, 6).map(f => (
                    <div key={f.key} className="flex justify-between">
                      <span className="text-zinc-400">{f.label}</span>
                      <span className="font-medium text-zinc-700">₹{((s.data[f.key] || 0) / 1e5).toFixed(1)}L</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Card className="border border-zinc-200 rounded-xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">
              {snapshots.find(s => s.period_month === editing.period_month && s.period_year === editing.period_year) ? 'Edit' : 'New'} period snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><Label className="text-xs">Month</Label><Input type="number" min={1} max={12} value={editing.period_month} onChange={(e) => setEditing({ ...editing, period_month: parseInt(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Year</Label><Input type="number" value={editing.period_year} onChange={(e) => setEditing({ ...editing, period_year: parseInt(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Months covered</Label><Input type="number" min={1} max={12} value={editing.months_covered} onChange={(e) => setEditing({ ...editing, months_covered: parseInt(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FIELDS.map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label} ₹</Label>
                  <Input type="number" value={editing.data[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={pending}>{pending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving…</> : 'Save snapshot'}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

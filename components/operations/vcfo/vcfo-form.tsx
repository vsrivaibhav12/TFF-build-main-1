'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertVcfoSnapshotAction } from '@/lib/actions/vcfo';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  clientId: string;
  latest?: {
    month: number;
    year: number;
    cash_in_bank?: number | null;
    monthly_burn?: number | null;
    revenue?: number | null;
    budgeted_revenue?: number | null;
    budgeted_expenses?: number | null;
    actual_revenue?: number | null;
    actual_expenses?: number | null;
    advisor_notes?: string | null;
  } | null;
}

export default function VcfoForm({ clientId, latest }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(latest?.month ?? new Date().getMonth() + 1);
  const [year, setYear] = useState(latest?.year ?? new Date().getFullYear());
  const [cashInBank, setCashInBank] = useState(latest?.cash_in_bank ?? '');
  const [monthlyBurn, setMonthlyBurn] = useState(latest?.monthly_burn ?? '');
  const [revenue, setRevenue] = useState(latest?.revenue ?? '');
  const [budgetedRevenue, setBudgetedRevenue] = useState(latest?.budgeted_revenue ?? '');
  const [budgetedExpenses, setBudgetedExpenses] = useState(latest?.budgeted_expenses ?? '');
  const [actualRevenue, setActualRevenue] = useState(latest?.actual_revenue ?? '');
  const [actualExpenses, setActualExpenses] = useState(latest?.actual_expenses ?? '');
  const [advisorNotes, setAdvisorNotes] = useState(latest?.advisor_notes ?? '');
  const [keyExpenses, setKeyExpenses] = useState<Record<string, number>>(
    (latest as any)?.key_expenses ?? {}
  );
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  function addKeyExpense() {
    if (!newKey.trim()) return;
    setKeyExpenses({ ...keyExpenses, [newKey.trim()]: Number(newValue) || 0 });
    setNewKey('');
    setNewValue('');
  }

  function removeKeyExpense(k: string) {
    const next = { ...keyExpenses };
    delete next[k];
    setKeyExpenses(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await upsertVcfoSnapshotAction({
      client_id: clientId,
      month,
      year,
      cash_in_bank: cashInBank === '' ? undefined : Number(cashInBank),
      monthly_burn: monthlyBurn === '' ? undefined : Number(monthlyBurn),
      revenue: revenue === '' ? undefined : Number(revenue),
      budgeted_revenue: budgetedRevenue === '' ? undefined : Number(budgetedRevenue),
      budgeted_expenses: budgetedExpenses === '' ? undefined : Number(budgetedExpenses),
      actual_revenue: actualRevenue === '' ? undefined : Number(actualRevenue),
      actual_expenses: actualExpenses === '' ? undefined : Number(actualExpenses),
      advisor_notes: advisorNotes || undefined,
      key_expenses: Object.keys(keyExpenses).length > 0 ? keyExpenses : undefined,
    });
    setLoading(false);
    if (res.success) {
      setOpen(false);
      window.location.reload();
    } else {
      alert(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> {latest ? 'Update snapshot' : 'New snapshot'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>vCFO snapshot</DialogTitle>
          <DialogDescription>Enter monthly financial data for cash runway and variance analysis.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vcfo-month">Month</Label>
              <Input id="vcfo-month" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vcfo-year">Year</Label>
              <Input id="vcfo-year" type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cash">Cash in bank</Label>
              <Input id="cash" type="number" min={0} value={cashInBank} onChange={(e) => setCashInBank(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="burn">Monthly burn</Label>
              <Input id="burn" type="number" min={0} value={monthlyBurn} onChange={(e) => setMonthlyBurn(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-rev">Budgeted revenue</Label>
              <Input id="budget-rev" type="number" min={0} value={budgetedRevenue} onChange={(e) => setBudgetedRevenue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-rev">Actual revenue</Label>
              <Input id="actual-rev" type="number" min={0} value={actualRevenue} onChange={(e) => setActualRevenue(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-exp">Budgeted expenses</Label>
              <Input id="budget-exp" type="number" min={0} value={budgetedExpenses} onChange={(e) => setBudgetedExpenses(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-exp">Actual expenses</Label>
              <Input id="actual-exp" type="number" min={0} value={actualExpenses} onChange={(e) => setActualExpenses(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenue">Revenue (override)</Label>
            <Input id="revenue" type="number" min={0} value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Advisor notes</Label>
            <Textarea id="notes" value={advisorNotes} onChange={(e) => setAdvisorNotes(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Key expenses</Label>
            <div className="space-y-2">
              {Object.entries(keyExpenses).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-medium">{k}</span>
                  <span className="text-sm text-zinc-500">₹{Number(v).toLocaleString('en-IN')}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeKeyExpense(k)}>
                    ×
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input placeholder="Expense name" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="flex-1" />
                <Input placeholder="Amount" type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="w-28" />
                <Button type="button" variant="outline" size="sm" onClick={addKeyExpense}>Add</Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save snapshot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

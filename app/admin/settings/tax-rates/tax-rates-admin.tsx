'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { upsertIncomeTaxSlabAction, deleteIncomeTaxSlabAction } from '@/lib/actions/income-tax';

interface Slab {
  id?: string;
  assessment_year: string;
  category: string;
  min_income: number;
  max_income: number | null;
  rate_percent: number;
  surcharge_percent: number;
  cess_percent: number;
}

const CATEGORIES = [
  'individual',
  'huf',
  'company_domestic',
  'company_foreign',
  'llp',
  'partnership',
  'aop',
  'boi',
  'trust',
  'cooperative',
];

const DEFAULT_AY = '2025-26';

function emptySlab(): Slab {
  return { assessment_year: DEFAULT_AY, category: 'individual', min_income: 0, max_income: null, rate_percent: 0, surcharge_percent: 0, cess_percent: 4 };
}

export default function TaxRatesAdmin({ initialSlabs }: { initialSlabs: Slab[] }) {
  const [slabs, setSlabs] = useState<Slab[]>(initialSlabs);
  const [editing, setEditing] = useState<Slab | null>(null);
  const [pending, startTransition] = useTransition();
  const [filterAy, setFilterAy] = useState<string>('');
  const [filterCat, setFilterCat] = useState<string>('');

  const assessmentYears = Array.from(new Set(slabs.map(s => s.assessment_year))).sort().reverse();

  const filtered = slabs.filter(s => {
    if (filterAy && s.assessment_year !== filterAy) return false;
    if (filterCat && s.category !== filterCat) return false;
    return true;
  });

  function save() {
    if (!editing) return;
    startTransition(async () => {
      const r = await upsertIncomeTaxSlabAction(editing);
      if (r.success) {
        toast.success('Slab saved');
        setEditing(null);
        const existing = slabs.find(s => s.id === r.data.id);
        if (existing) {
          setSlabs(slabs.map(s => s.id === r.data.id ? r.data : s));
        } else {
          setSlabs([...slabs, r.data]);
        }
      } else {
        toast.error(r.error);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteIncomeTaxSlabAction(id);
      if (r.success) {
        toast.success('Slab deleted');
        setSlabs(slabs.filter(s => s.id !== id));
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Assessment year</Label>
          <Select value={filterAy} onValueChange={setFilterAy}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {assessmentYears.map(ay => <SelectItem key={ay} value={ay}>{ay}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Category</Label>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setEditing(emptySlab())}><Plus className="h-4 w-4 mr-1" /> Add slab</Button>
      </div>

      {editing && (
        <Card className="border border-zinc-200 rounded-xl">
          <CardHeader className="p-5 pb-3"><CardTitle className="text-base font-semibold">{editing.id ? 'Edit' : 'New'} slab</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1"><Label className="text-xs">Assessment year</Label><Input value={editing.assessment_year} onChange={(e) => setEditing({ ...editing, assessment_year: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Category</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Min income ₹</Label><Input type="number" value={editing.min_income} onChange={(e) => setEditing({ ...editing, min_income: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Max income ₹ (blank = no limit)</Label><Input type="number" value={editing.max_income ?? ''} onChange={(e) => setEditing({ ...editing, max_income: e.target.value === '' ? null : Number(e.target.value) })} placeholder="∞" /></div>
              <div className="space-y-1"><Label className="text-xs">Rate %</Label><Input type="number" step={0.01} value={editing.rate_percent} onChange={(e) => setEditing({ ...editing, rate_percent: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Surcharge %</Label><Input type="number" step={0.01} value={editing.surcharge_percent} onChange={(e) => setEditing({ ...editing, surcharge_percent: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Health & education cess %</Label><Input type="number" step={0.01} value={editing.cess_percent} onChange={(e) => setEditing({ ...editing, cess_percent: Number(e.target.value) })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={pending}>{pending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving…</> : <><Save className="h-3 w-3 mr-1" />Save slab</>}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="tff-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
              <TableHead>AY</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Min income</TableHead>
              <TableHead className="text-right">Max income</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Surcharge</TableHead>
              <TableHead className="text-right">Cess</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.assessment_year}</TableCell>
                <TableCell>{s.category}</TableCell>
                <TableCell className="text-right tabular-nums">₹{s.min_income.toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-right tabular-nums">{s.max_income != null ? `₹${s.max_income.toLocaleString('en-IN')}` : '∞'}</TableCell>
                <TableCell className="text-right tabular-nums">{s.rate_percent}%</TableCell>
                <TableCell className="text-right tabular-nums">{s.surcharge_percent}%</TableCell>
                <TableCell className="text-right tabular-nums">{s.cess_percent}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing({ ...s })}>
                      <span className="text-xs text-teal-600 font-medium">Edit</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => s.id && remove(s.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-zinc-500 py-8">No slabs found. Add one to get started.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

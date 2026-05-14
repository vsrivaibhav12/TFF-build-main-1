'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createTaskAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';

interface Props {
  clients: { id: string; business_name: string; group_id: string | null }[];
  team: { id: string; full_name: string }[];
  groups: { id: string; name: string }[];
}

export default function BulkTaskForm({ clients, team, groups }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<'clients' | 'details' | 'preview'>('clients');

  // Client selection
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // Task details
  const [f, setF] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    assigned_to: '',
    reviewer_id: '',
    due_date: '',
    period_year: '',
    period_month: '',
    period_quarter: '',
    is_billable: false,
    bill_reference: '',
    bill_amount: '',
    sub_service_id: '',
    task_template_id: '',
  });

  const filteredClients = groupFilter === 'all'
    ? clients
    : clients.filter((c) => c.group_id === groupFilter);

  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedClients.has(c.id));

  function toggleClient(id: string) {
    const ns = new Set(selectedClients);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelectedClients(ns);
  }

  function toggleAllFiltered() {
    const ns = new Set(selectedClients);
    if (allFilteredSelected) {
      filteredClients.forEach((c) => ns.delete(c.id));
    } else {
      filteredClients.forEach((c) => ns.add(c.id));
    }
    setSelectedClients(ns);
  }

  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }

  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function doCreate() {
    if (selectedClients.size === 0) { toast.error('Select at least one client'); return; }
    if (!f.title.trim()) { toast.error('Title is required'); return; }
    if (!f.due_date) { toast.error('Due date is required'); return; }

    startTransition(async () => {
      setProgress({ done: 0, total: selectedClients.size });
      let success = 0;
      let failed = 0;

      for (const clientId of selectedClients) {
        const payload: any = {
          client_id: clientId,
          title: f.title.trim(),
          description: f.description || undefined,
          priority: f.priority,
          assigned_to: f.assigned_to || undefined,
          reviewer_id: f.reviewer_id || undefined,
          due_date: f.due_date,
          sub_service_id: f.sub_service_id || undefined,
          task_template_id: f.task_template_id || undefined,
          period_year: f.period_year ? parseInt(f.period_year, 10) : undefined,
          period_month: f.period_month ? parseInt(f.period_month, 10) : undefined,
          period_quarter: f.period_quarter ? parseInt(f.period_quarter, 10) : undefined,
          is_billable: f.is_billable,
          bill_reference: f.bill_reference || undefined,
          bill_amount: f.bill_amount ? parseFloat(f.bill_amount) : undefined,
        };

        const r = await createTaskAction(payload);
        if (r.success) success++;
        else failed++;

        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      toast.success(`Created ${success} tasks${failed > 0 ? `, ${failed} failed` : ''}`);
      if (success > 0) {
        router.push('/admin/tasks');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['clients', 'details', 'preview'] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`px-3 py-1.5 rounded-md border ${step === s ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
          >
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {step === 'clients' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Filter by group</Label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All groups" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-zinc-500 ml-auto">{selectedClients.size} selected</span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200 flex items-center gap-2">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Select all visible</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredClients.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-0">
                  <Checkbox checked={selectedClients.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                  <span className="text-sm text-zinc-900">{c.business_name}</span>
                  {c.group_id && (
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 ml-auto">
                      {groups.find((g) => g.id === c.group_id)?.name}
                    </span>
                  )}
                </label>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-sm text-zinc-400 px-4 py-6 text-center">No clients in this group</p>
              )}
            </div>
          </div>

          <Button onClick={() => setStep('details')} disabled={selectedClients.size === 0}>
            Next: Task details
          </Button>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Prepare GSTR-3B for Sept" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => set('priority', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                  <SelectItem value="urgent">urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Due date *</Label><Input type="date" value={f.due_date} onChange={(e) => set('due_date', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={f.assigned_to} onValueChange={(v) => set('assigned_to', v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewer</Label>
              <Select value={f.reviewer_id} onValueChange={(v) => set('reviewer_id', v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Period year</Label><Input type="number" min={2000} max={2100} value={f.period_year} onChange={(e) => set('period_year', e.target.value)} placeholder="2026" /></div>
            <div className="space-y-2"><Label>Period month</Label><Input type="number" min={1} max={12} value={f.period_month} onChange={(e) => set('period_month', e.target.value)} placeholder="1-12" /></div>
            <div className="space-y-2"><Label>Quarter</Label><Input type="number" min={1} max={4} value={f.period_quarter} onChange={(e) => set('period_quarter', e.target.value)} placeholder="1-4" /></div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="billable" checked={f.is_billable} onCheckedChange={(v) => set('is_billable', v === true)} />
            <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
            {f.is_billable && (
              <>
                <Input className="flex-1" value={f.bill_reference} onChange={(e) => set('bill_reference', e.target.value)} placeholder="Bill reference" />
                <Input type="number" className="w-28" value={f.bill_amount} onChange={(e) => set('bill_amount', e.target.value)} placeholder="Amount" />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('clients')}>Back</Button>
            <Button onClick={() => setStep('preview')}>Next: Preview</Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold text-zinc-900">Preview</h3>
            <div className="text-sm text-zinc-600 space-y-1">
              <p><strong>Clients:</strong> {selectedClients.size}</p>
              <p><strong>Title:</strong> {f.title}</p>
              <p><strong>Due:</strong> {f.due_date || '—'}</p>
              <p><strong>Priority:</strong> {f.priority}</p>
              <p><strong>Billable:</strong> {f.is_billable ? `Yes · ${f.bill_reference || 'No ref'} · ₹${f.bill_amount || 0}` : 'No'}</p>
            </div>
            {pending && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-teal-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating {progress.done} of {progress.total} tasks…
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStep('details')} disabled={pending}>Back</Button>
            <Button onClick={doCreate} disabled={pending}>
              {pending ? 'Creating…' : `Create ${selectedClients.size} tasks`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

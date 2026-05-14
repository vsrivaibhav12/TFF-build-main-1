'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import {
  upsertProfitCentreAction,
  upsertCostCentreAction,
  deleteCentreAction,
} from '@/lib/actions/billing-org';

interface Row {
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function CentresAdmin({
  kind,
  title,
  rows,
}: {
  kind: 'profit' | 'cost';
  title: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, startTransition] = useTransition();
  const upsert = kind === 'profit' ? upsertProfitCentreAction : upsertCostCentreAction;

  function add() {
    if (!code || !name) return;
    startTransition(async () => {
      const r = await upsert({ code: code.toUpperCase(), name, description: description || null, is_active: true });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`${title.replace(/s$/, '')} added`);
        setCode(''); setName(''); setDescription('');
        router.refresh();
      }
    });
  }

  function deactivate(c: string) {
    startTransition(async () => {
      const r = await deleteCentreAction({ table: kind === 'profit' ? 'profit_centres' : 'cost_centres', code: c });
      if (!r.success) toast.error(r.error);
      else { toast.success('Deactivated'); router.refresh(); }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {rows.length > 0 ? (
        <ul className="divide-y divide-zinc-100" data-testid={`centres-${kind}`}>
          {rows.map((r) => (
            <li key={r.code} className="flex items-center justify-between py-2.5">
              <div>
                <code className="bg-zinc-100 rounded px-1.5 py-0.5 text-xs font-mono mr-2">{r.code}</code>
                <span className="font-medium">{r.name}</span>
                {!r.is_active && <Badge variant="outline" className="ml-2 text-[10px]">inactive</Badge>}
                {r.description && <p className="text-xs text-zinc-500 mt-0.5 ml-1">{r.description}</p>}
              </div>
              {r.is_active && (
                <Button size="sm" variant="ghost" onClick={() => deactivate(r.code)} disabled={pending}>
                  <Power className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">None yet.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-3 border-t border-zinc-100">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CAS" maxLength={12} data-testid={`centre-${kind}-code`} />
        </div>
        <div className="sm:col-span-4 space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Compliance-as-a-Service" data-testid={`centre-${kind}-name`} />
        </div>
        <div className="sm:col-span-5 space-y-1">
          <Label className="text-xs">Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One-line description" />
        </div>
        <div className="sm:col-span-1 flex items-end">
          <Button onClick={add} disabled={pending || !code || !name} className="w-full" data-testid={`centre-${kind}-add`}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

'use client';
import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { setUserCapabilitiesAction } from '@/lib/actions/staff-capabilities';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

// Group capabilities by domain prefix for visual grouping.
function group(all: string[]) {
  const out: Record<string, string[]> = {};
  for (const cap of all) {
    const [prefix] = cap.split('.');
    if (!out[prefix]) out[prefix] = [];
    out[prefix].push(cap);
  }
  return out;
}

export default function CapabilitiesForm({ userId, userName, all, granted }: { userId: string; userName: string; all: string[]; granted: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(granted));
  const [filter, setFilter] = useState('');
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => group(all), [all]);
  const groups = Object.keys(grouped).sort();

  function toggle(cap: string) {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(cap)) ns.delete(cap);
      else ns.add(cap);
      return ns;
    });
  }

  function save() {
    startTransition(async () => {
      const r = await setUserCapabilitiesAction({ user_id: userId, capabilities: [...selected] as any });
      if (r.success) toast.success(`Saved · +${(r as any).data.granted} / -${(r as any).data.revoked}`);
      else toast.error(r.error);
    });
  }

  const fSet = filter.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter capabilities…" className="pl-9" data-testid="caps-filter" />
        </div>
        <div className="text-sm text-zinc-500 whitespace-nowrap">{selected.size} / {all.length} selected</div>
      </div>

      <div className="space-y-6">
        {groups.map((g) => {
          const list = grouped[g].filter((c) => !fSet || c.includes(fSet));
          if (list.length === 0) return null;
          return (
            <div key={g} className="rounded-xl border border-zinc-200 bg-white">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <div className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{g}</div>
                <div className="text-xs text-zinc-500">{list.filter((c) => selected.has(c)).length} / {list.length}</div>
              </div>
              <ul className="divide-y divide-zinc-100">
                {list.map((cap) => (
                  <li key={cap} className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      id={`cap-${cap}`}
                      checked={selected.has(cap)}
                      onCheckedChange={() => toggle(cap)}
                      data-testid={`cap-${cap}`}
                    />
                    <Label htmlFor={`cap-${cap}`} className="font-mono text-sm cursor-pointer">{cap}</Label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
        <div className="text-sm text-zinc-500">Saving will grant or revoke against the current state. Each change writes one audit entry.</div>
        <Button onClick={save} disabled={pending} data-testid="caps-save">
          {pending ? 'Saving…' : `Save changes for ${userName}`}
        </Button>
      </div>
    </div>
  );
}

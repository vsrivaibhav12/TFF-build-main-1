'use client';
import { useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface VersionRow {
  id: string;
  version: number;
  is_current: boolean;
  created_at: string;
  data: Record<string, any>;
}

/**
 * Generic version diff component. Compares the current row to a chosen past
 * version, renders a key-by-key list with changed fields highlighted.
 * Caller decides how to load `versions` — we just visualise.
 */
export default function VersionDiff({ label = 'View history', versions }: { label?: string; versions: VersionRow[] }) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const current = sorted[0];
  const [otherId, setOtherId] = useState<string>(sorted[1]?.id ?? '');
  const other = sorted.find((v) => v.id === otherId);
  const keys = current ? Object.keys(current.data) : [];

  if (sorted.length < 2) {
    return <Button variant="outline" size="sm" disabled className="text-xs"><History className="h-3 w-3" /> No previous versions</Button>;
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs" data-testid="version-history"><History className="h-3 w-3" /> {label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Version history</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-zinc-500">Compare current with:</span>
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)} className="text-xs border border-zinc-200 rounded px-2 py-1">
            {sorted.slice(1).map((v) => (
              <option key={v.id} value={v.id}>v{v.version} — {formatDateIST(v.created_at)}</option>
            ))}
          </select>
        </div>
        <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
          {keys.map((k) => {
            const a = current.data[k];
            const b = other?.data?.[k];
            const changed = JSON.stringify(a) !== JSON.stringify(b);
            return (
              <div key={k} className={cn('grid grid-cols-3 gap-2 py-2 text-xs', changed && 'bg-amber-50 -mx-2 px-2 rounded')}>
                <div className="font-mono text-zinc-500">{k} {changed && <Badge variant="warning" className="ml-1">changed</Badge>}</div>
                <div className="text-zinc-400 line-through">{b !== undefined ? String(b) : '—'}</div>
                <div className="font-medium text-teal-800">{a !== undefined ? String(a) : '—'}</div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

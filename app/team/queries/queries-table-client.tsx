'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateIST } from '@/lib/utils';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';

interface QueryRow {
  id: string;
  subject: string;
  status: string;
  updated_at: string;
  clients?: { business_name: string } | null;
  creator?: { full_name: string | null } | null;
}

export default function QueriesTableClient({ queries }: { queries: QueryRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  }

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white divide-y">
        {queries.map((q) => (
          <div key={q.id} className="flex items-center gap-4 px-4 hover:bg-zinc-50">
            <Checkbox 
              checked={selected.has(q.id)} 
              onCheckedChange={() => toggle(q.id)} 
              aria-label={`Select query ${q.subject}`}
            />
            <Link 
              href={`/team/queries/${q.id}`} 
              className="flex-1 flex items-center justify-between py-4" 
              data-testid={`query-row-${q.id}`}
            >
              <div>
                <div className="font-medium">{q.subject}</div>
                <div className="text-xs text-zinc-500">
                  {q.clients?.business_name} · {q.creator?.full_name} · {formatDateIST(q.updated_at)}
                </div>
              </div>
              <Badge variant={q.status === 'open' ? 'warning' : q.status === 'in_progress' ? 'teal' : 'success'}>
                {q.status.replace(/_/g, ' ')}
              </Badge>
            </Link>
          </div>
        ))}
      </div>
      <BulkActionsBar 
        ids={[...selected]} 
        entityType="queries" 
        onClear={() => setSelected(new Set())} 
      />
    </>
  );
}

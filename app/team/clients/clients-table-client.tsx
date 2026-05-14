'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ClientRow {
  id: string;
  business_name: string;
  pan: string | null;
  gstin: string | null;
  lifecycle_stage: string;
}

export default function ClientsTableClient({ clients }: { clients: ClientRow[] }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<string>('business_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-teal-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-600" />
    );
  }

  const sorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let data = [...clients];
    if (term) {
      data = data.filter(
        (c) =>
          c.business_name.toLowerCase().includes(term) ||
          c.pan?.toLowerCase().includes(term) ||
          c.gstin?.toLowerCase().includes(term)
      );
    }
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof ClientRow];
      let vb: any = b[sortKey as keyof ClientRow];
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [clients, q, sortKey, sortDir]);

  return (
    <>
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search clients..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-zinc-50/50">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('business_name')}>
                <span className="flex items-center gap-1">Business <SortIcon col="business_name" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('pan')}>
                <span className="flex items-center gap-1">PAN <SortIcon col="pan" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('gstin')}>
                <span className="flex items-center gap-1">GSTIN <SortIcon col="gstin" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lifecycle_stage')}>
                <span className="flex items-center gap-1">Stage <SortIcon col="lifecycle_stage" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id} data-row>
                <TableCell>
                  <Link href={`/team/clients/${c.id}`} className="font-medium text-zinc-900 hover:text-teal-700 transition-colors">
                    {c.business_name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-500">{c.pan ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs text-zinc-500">{c.gstin ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="teal">{c.lifecycle_stage}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ClientRow {
  id: string;
  business_name: string;
  pan: string | null;
  gstin: string | null;
  lifecycle_stage: string;
  portal_enabled: boolean;
  created_at: string;
  primary_contact_email?: string | null;
  group_name?: string | null;
}

export default function ClientsTableClient({ clients }: { clients: ClientRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('business_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const allSelected = clients.length > 0 && selected.size === clients.length;

  function toggle(id: string) {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(clients.map((c) => c.id)));
  }

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
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  const sorted = useMemo(() => {
    const data = [...clients];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof ClientRow];
      let vb: any = b[sortKey as keyof ClientRow];
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (typeof va === 'boolean') va = va ? 1 : 0;
      if (typeof vb === 'boolean') vb = vb ? 1 : 0;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [clients, sortKey, sortDir]);

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-zinc-50/50">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
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
              <TableHead>Group</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('portal_enabled')}>
                <span className="flex items-center gap-1">Portal <SortIcon col="portal_enabled" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                <span className="flex items-center gap-1">Created <SortIcon col="created_at" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id} data-testid={`client-row-${c.id}`} className={selected.has(c.id) ? 'bg-teal-50/40' : ''} data-row>
                <TableCell>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label={`Select ${c.business_name}`} />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/clients/${c.id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                    {c.business_name}
                  </Link>
                  {c.primary_contact_email ? <div className="text-xs text-zinc-500">{c.primary_contact_email}</div> : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{c.pan ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{c.gstin ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="teal">{c.lifecycle_stage}</Badge>
                </TableCell>
                <TableCell>
                  {c.group_name ? <Badge variant="outline">{c.group_name}</Badge> : <span className="text-zinc-400 text-xs">—</span>}
                </TableCell>
                <TableCell>
                  {c.portal_enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}
                </TableCell>
                <TableCell className="text-zinc-500">{formatDateIST(c.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <BulkActionsBar 
        ids={[...selected]} 
        entityType="clients" 
        onClear={() => setSelected(new Set())} 
      />
    </>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function AuditFilters({ initial }: { initial: { actor?: string; action?: string; entity?: string; from?: string; to?: string } }) {
  const router = useRouter();
  const [f, setF] = useState({ action: initial.action ?? '', entity: initial.entity ?? '', from: initial.from ?? '', to: initial.to ?? '' });
  function apply() {
    const params = new URLSearchParams();
    if (f.action) params.set('action', f.action);
    if (f.entity) params.set('entity', f.entity);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    router.push(`/admin/audit?${params.toString()}`);
  }
  function clear() { router.push('/admin/audit'); }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="space-y-1"><Label className="text-xs">Action</Label><Input placeholder="e.g. capability.grant" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-xs">Entity</Label><Input placeholder="e.g. user, client" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
      <div className="flex items-end gap-2"><Button onClick={apply} data-testid="audit-apply">Apply</Button><Button onClick={clear} variant="outline">Clear</Button></div>
    </div>
  );
}

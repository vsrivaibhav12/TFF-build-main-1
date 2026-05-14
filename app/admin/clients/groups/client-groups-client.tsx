'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createClientGroup, updateClientGroup, deleteClientGroup } from '@/lib/actions/clients';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string | null;
}

export default function ClientGroupsClient({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  function onCreate() {
    if (!newName.trim()) { toast.error('Group name is required'); return; }
    startTransition(async () => {
      const r = await createClientGroup({ name: newName.trim(), description: newDesc.trim() || undefined });
      if (r.success) {
        toast.success('Group created');
        setNewName('');
        setNewDesc('');
        setShowAdd(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function onUpdate(id: string) {
    if (!editName.trim()) { toast.error('Group name is required'); return; }
    startTransition(async () => {
      const r = await updateClientGroup(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      if (r.success) {
        toast.success('Group updated');
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this group? Clients in this group will become ungrouped.')) return;
    startTransition(async () => {
      const r = await deleteClientGroup(id);
      if (r.success) {
        toast.success('Group deleted');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showAdd ? (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add group
          </Button>
        ) : (
          <div className="w-full rounded-xl border border-zinc-200 p-4 bg-white space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Premium clients" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onCreate} disabled={pending} className="bg-teal-600 hover:bg-teal-700">
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewDesc(''); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">Description</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-b border-zinc-100 last:border-0">
                {editingId === g.id ? (
                  <>
                    <td className="px-4 py-3">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                    </td>
                    <td className="px-4 py-3">
                      <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate(g.id)} disabled={pending}>
                          <Check className="h-4 w-4 text-teal-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-zinc-900">{g.name}</td>
                    <td className="px-4 py-3 text-zinc-500">{g.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(g.id); setEditName(g.name); setEditDesc(g.description || ''); }}>
                          <Pencil className="h-4 w-4 text-zinc-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(g.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

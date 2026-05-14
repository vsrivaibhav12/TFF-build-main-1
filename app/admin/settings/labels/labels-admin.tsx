'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createLabelAction, deactivateLabelAction } from '@/lib/actions/task-custom-fields';
import type { TaskLabel } from '@/lib/repositories/task-custom-fields';

const COLOR_PRESETS = ['#0ea5e9', '#14b8a6', '#84cc16', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function LabelsAdmin({ initial }: { initial: TaskLabel[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ code: '', display_name: '', color_hex: COLOR_PRESETS[0] });

  function add() {
    if (!form.code.trim() || !form.display_name.trim()) {
      toast.error('Code and display name are required');
      return;
    }
    startTransition(async () => {
      const r = await createLabelAction(form);
      if (!r.success) { toast.error(r.error); return; }
      toast.success(`Label "${form.display_name}" created`);
      setForm({ code: '', display_name: '', color_hex: COLOR_PRESETS[0] });
      router.refresh();
    });
  }

  function deactivate(code: string) {
    startTransition(async () => {
      const r = await deactivateLabelAction(code);
      if (!r.success) { toast.error(r.error); return; }
      toast.success('Label archived');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold mb-4">Add new label</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="urgent" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Urgent" />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-1.5 mt-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color_hex: c })}
                  className={`h-7 w-7 rounded-full border-2 ${form.color_hex === c ? 'border-zinc-900' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={add} disabled={pending} data-testid="add-label-btn">
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add label
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold">Existing labels</h2>
        </div>
        {initial.length === 0 ? (
          <div className="p-8 text-sm text-zinc-500 text-center">No labels yet. Add your first above — for example "urgent", "high-value", "audit".</div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {initial.map((l) => (
              <li key={l.code} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color_hex ?? '#64748b' }} />
                  <span className="font-medium">{l.display_name}</span>
                  <code className="text-xs text-zinc-400">{l.code}</code>
                </div>
                <button
                  onClick={() => deactivate(l.code)}
                  disabled={pending}
                  className="text-zinc-400 hover:text-red-600 p-1"
                  aria-label={`Archive ${l.display_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

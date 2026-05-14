'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileQuestion, Plus, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateIST } from '@/lib/utils';
import {
  createDocumentRequestAction,
  deleteDocumentRequestAction,
  fulfillDocumentRequestAction,
  seedDocumentRequestsFromTemplate,
} from '@/lib/actions/document-requests';
import type { DocumentRequest } from '@/lib/repositories/document-requests';

interface Props {
  taskId: string;
  subServiceId: string | null;
  initial: DocumentRequest[];
}

export default function DocumentRequestsPanel({ taskId, subServiceId, initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<DocumentRequest[]>(initial);
  const [name, setName] = useState('');
  const [required, setRequired] = useState(true);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!name.trim()) return;
    const docName = name.trim();
    setName('');
    startTransition(async () => {
      const r = await createDocumentRequestAction({
        task_id: taskId,
        document_name: docName,
        is_required: required,
      });
      if (!r.success) toast.error(r.error);
      else {
        toast.success('Request added');
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    setItems((arr) => arr.filter((r) => r.id !== id));
    startTransition(async () => {
      const r = await deleteDocumentRequestAction({ id, task_id: taskId });
      if (!r.success) toast.error(r.error);
      else router.refresh();
    });
  }

  function fulfill(id: string) {
    setItems((arr) => arr.map((r) => (r.id === id ? { ...r, fulfilled_at: new Date().toISOString() } : r)));
    startTransition(async () => {
      const r = await fulfillDocumentRequestAction({ request_id: id });
      if (!r.success) toast.error(r.error);
      else {
        if ((r as any).data?.unblocked) toast.success('All required documents received — task unblocked.');
        else toast.success('Marked as received');
        router.refresh();
      }
    });
  }

  function seedFromTemplate() {
    if (!subServiceId) return;
    startTransition(async () => {
      const r = await seedDocumentRequestsFromTemplate({ task_id: taskId, sub_service_id: subServiceId });
      if (!r.success) toast.error(r.error);
      else {
        const inserted = (r as any).data?.inserted ?? 0;
        toast.success(inserted > 0 ? `Added ${inserted} from template` : 'Template already applied');
        router.refresh();
      }
    });
  }

  const required_open = items.filter((i) => i.is_required && !i.fulfilled_at).length;
  const all_open = items.filter((i) => !i.fulfilled_at).length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4" data-testid="doc-requests-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-amber-600" /> Document requests
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {items.length === 0
              ? 'No requests yet. Add the documents we need from the client.'
              : `${items.length - all_open} of ${items.length} received · ${required_open} required still open.`}
          </p>
        </div>
        {subServiceId && items.length === 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={seedFromTemplate}
            disabled={pending}
            data-testid="doc-seed-template"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Use template
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((r) => {
            const done = !!r.fulfilled_at;
            return (
              <li
                key={r.id}
                className={`flex items-start gap-3 rounded-lg border border-zinc-200 p-3 ${done ? 'bg-teal-50/30 border-teal-200' : ''}`}
                data-testid={`doc-req-${r.id}`}
              >
                <Checkbox checked={done} onCheckedChange={() => !done && fulfill(r.id)} disabled={done || pending} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${done ? 'text-zinc-500 line-through' : ''}`}>
                    {r.document_name}
                  </div>
                  {r.description && (
                    <div className="text-xs text-zinc-500 mt-0.5">{r.description}</div>
                  )}
                  {r.due_date && (
                    <div className="text-[10px] text-zinc-400 mt-1">due {formatDateIST(r.due_date)}</div>
                  )}
                  {done && (
                    <div className="text-[10px] text-teal-700 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> received {formatDateIST(r.fulfilled_at!)}
                      {r.fulfilled_by?.full_name && <span className="text-zinc-500">· by {r.fulfilled_by.full_name}</span>}
                    </div>
                  )}
                </div>
                {!r.is_required && (
                  <Badge variant="outline" className="text-[9px]">optional</Badge>
                )}
                {!done && (
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={pending}
                    className="text-zinc-300 hover:text-red-500"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="e.g. Sales register for May 2026"
          className="flex-1"
          data-testid="doc-req-input"
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
          <Checkbox checked={required} onCheckedChange={(v) => setRequired(!!v)} /> required
        </label>
        <Button size="sm" onClick={add} disabled={!name.trim() || pending} data-testid="doc-req-add">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

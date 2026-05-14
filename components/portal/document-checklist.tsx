'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileQuestion, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateIST } from '@/lib/utils';
import { fulfillDocumentRequestAction } from '@/lib/actions/document-requests';
import { uploadDocumentForRequest } from '@/lib/actions/portal-uploads';
import type { DocumentRequest } from '@/lib/repositories/document-requests';

/**
 * Client portal checklist. Lets the client either:
 *  - Upload a file → action creates documents row → marks request fulfilled.
 *  - Mark "I'll share offline" → request fulfilled with no document_id (rare).
 */
export default function PortalDocumentChecklist({
  taskId,
  initial,
}: {
  taskId: string;
  initial: DocumentRequest[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<DocumentRequest[]>(initial);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const open = items.filter((r) => !r.fulfilled_at).length;
  const required_open = items.filter((r) => r.is_required && !r.fulfilled_at).length;

  function onPicked(reqId: string, file: File | null) {
    if (!file) return;
    setBusyId(reqId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('request_id', reqId);
      fd.set('task_id', taskId);
      fd.set('file', file);
      const r = await uploadDocumentForRequest(fd);
      setBusyId(null);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success('Uploaded. Thank you.');
      setItems((arr) => arr.map((it) => (it.id === reqId ? { ...it, fulfilled_at: new Date().toISOString() } : it)));
      router.refresh();
    });
  }

  function markOffline(reqId: string) {
    setBusyId(reqId);
    startTransition(async () => {
      const r = await fulfillDocumentRequestAction({ request_id: reqId });
      setBusyId(null);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("We'll reconcile it from offline. Thanks.");
      setItems((arr) => arr.map((it) => (it.id === reqId ? { ...it, fulfilled_at: new Date().toISOString() } : it)));
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6 space-y-4" data-testid="portal-doc-checklist">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-amber-700" /> Documents we need from you
        </h3>
        <p className="text-sm text-zinc-700 mt-1">
          {open === 0
            ? 'All documents received. Thank you.'
            : `${open} pending · ${required_open} required.`}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((r) => {
          const done = !!r.fulfilled_at;
          return (
            <li
              key={r.id}
              className={`rounded-lg border ${done ? 'border-teal-200 bg-teal-50/30' : 'border-zinc-200 bg-white'} p-3 flex items-start gap-3`}
              data-testid={`portal-doc-req-${r.id}`}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5" />
              ) : (
                <Upload className="h-4 w-4 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${done ? 'text-zinc-500 line-through' : ''}`}>
                  {r.document_name}
                </div>
                {r.description && (
                  <div className="text-xs text-zinc-500 mt-0.5">{r.description}</div>
                )}
                {r.due_date && !done && (
                  <div className="text-[10px] text-zinc-400 mt-1">due {formatDateIST(r.due_date)}</div>
                )}
                {done && r.fulfilled_at && (
                  <div className="text-[10px] text-teal-700 mt-1">received {formatDateIST(r.fulfilled_at)}</div>
                )}
              </div>
              {!r.is_required && (
                <Badge variant="outline" className="text-[9px]">optional</Badge>
              )}
              {!done && (
                <div className="flex items-center gap-2">
                  <label
                    className="inline-flex items-center gap-1 cursor-pointer text-xs text-teal-700 font-medium hover:underline"
                    data-testid={`portal-doc-upload-${r.id}`}
                  >
                    <Input
                      type="file"
                      className="hidden"
                      onChange={(e) => onPicked(r.id, e.target.files?.[0] ?? null)}
                      disabled={pending}
                    />
                    Upload
                  </label>
                  <button
                    type="button"
                    onClick={() => markOffline(r.id)}
                    disabled={pending}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 underline-offset-2 hover:underline"
                    data-testid={`portal-doc-offline-${r.id}`}
                  >
                    {busyId === r.id ? '…' : 'Shared offline'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

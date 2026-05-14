'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { setTaskStuckAction } from '@/lib/actions/task-flags';

const REASONS: Array<{ code: string; label: string }> = [
  { code: 'client_clarification', label: 'Awaiting client clarification' },
  { code: 'gst_portal_down',      label: 'GST portal unavailable' },
  { code: 'itd_portal_down',      label: 'Income Tax portal unavailable' },
  { code: 'mcadown',              label: 'MCA portal unavailable' },
  { code: 'mismatch_investigation', label: 'Reconciliation mismatch under investigation' },
  { code: 'awaiting_third_party', label: 'Awaiting bank / vendor / counterparty' },
  { code: 'awaiting_management',  label: 'Awaiting client management response' },
  { code: 'dsc_issue',            label: 'DSC unavailable / expired' },
  { code: 'payment_pending',      label: 'Tax/fee payment pending from client' },
  { code: 'other',                label: 'Other' },
];

interface Props {
  taskId: string;
  isStuck: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
}

export default function StuckToggle({ taskId, isStuck, reasonCode, reasonNote }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasonCode ?? '');
  const [note, setNote] = useState(reasonNote ?? '');
  const [pending, startTransition] = useTransition();

  function markStuck() {
    if (!reason) {
      toast.error('Pick a reason');
      return;
    }
    startTransition(async () => {
      const r = await setTaskStuckAction({ task_id: taskId, is_stuck: true, reason_code: reason as any, reason_note: note || null });
      if (!r.success) toast.error(r.error);
      else { toast.success('Task marked as stuck'); setOpen(false); router.refresh(); }
    });
  }
  function unstick() {
    startTransition(async () => {
      const r = await setTaskStuckAction({ task_id: taskId, is_stuck: false });
      if (!r.success) toast.error(r.error);
      else { toast.success('Task unstuck'); router.refresh(); }
    });
  }

  if (isStuck) {
    const friendlyReason = REASONS.find((r) => r.code === reasonCode)?.label ?? reasonCode ?? 'Stuck';
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 space-y-3" data-testid="stuck-banner">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="destructive" className="text-[10px]">stuck</Badge>
                <span className="ml-2 font-semibold text-red-900">{friendlyReason}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={unstick} disabled={pending} data-testid="stuck-unstick">
                <X className="h-3.5 w-3.5 mr-1" /> Unstick
              </Button>
            </div>
            {reasonNote && (
              <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{reasonNote}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2" data-testid="stuck-open">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Mark as stuck
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 space-y-3 bg-zinc-50/40">
      <div className="space-y-2">
        <Label className="text-sm">Why is this task stuck?</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger data-testid="stuck-reason"><SelectValue placeholder="Pick a reason" /></SelectTrigger>
          <SelectContent>
            {REASONS.map((r) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Details (optional, shown to client)</Label>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-testid="stuck-note" placeholder="What's blocking? When do we expect resolution?" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={markStuck} disabled={pending || !reason} data-testid="stuck-submit">
          {pending ? 'Saving…' : 'Mark stuck'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
      </div>
    </div>
  );
}

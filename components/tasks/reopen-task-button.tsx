'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { reopenTaskAction } from '@/lib/actions/tasks';
import { RotateCcw } from 'lucide-react';

export default function ReopenTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  function onReopen() {
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    startTransition(async () => {
      const r = await reopenTaskAction({ task_id: taskId, reason: reason.trim() });
      if (r.success) {
        toast.success('Task reopened');
        setConfirming(false);
        setReason('');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-amber-700">Reopening a completed task will reset its completion date and verification status.</p>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for reopening (required)" disabled={pending} />
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={onReopen} disabled={pending}>
            {pending ? 'Reopening...' : 'Confirm reopen'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setReason(''); }} disabled={pending}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)} className="text-amber-700 border-amber-200 hover:bg-amber-50">
      <RotateCcw className="h-4 w-4 mr-1" /> Reopen task
    </Button>
  );
}

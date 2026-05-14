'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyTaskAction } from '@/lib/actions/task-flags';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

export default function VerifyTaskButton({ taskId }: { taskId: string }) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function verify() {
    startTransition(async () => {
      const r = await verifyTaskAction({ task_id: taskId, note: note.trim() || null });
      if (r.success) {
        toast.success('Task verified');
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="border-teal-200 text-teal-700 hover:bg-teal-50">
        <ShieldCheck className="h-4 w-4 mr-1" /> Verify task
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional verification note…" className="text-sm" onKeyDown={(e) => { if (e.key === 'Enter') verify(); }} />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={verify} disabled={pending} className="bg-teal-600 hover:bg-teal-700">
          <ShieldCheck className="h-4 w-4 mr-1" /> Confirm verify
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
      </div>
    </div>
  );
}

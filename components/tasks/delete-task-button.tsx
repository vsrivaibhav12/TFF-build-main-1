'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { softDeleteTaskAction } from '@/lib/actions/tasks';
import { Trash2 } from 'lucide-react';

export default function DeleteTaskButton({ taskId, redirectTo }: { taskId: string; redirectTo: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onDelete() {
    startTransition(async () => {
      const r = await softDeleteTaskAction(taskId);
      if (r.success) {
        toast.success('Task deleted');
        router.push(redirectTo);
      } else {
        toast.error(r.error);
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Confirm delete?</span>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
          {pending ? 'Deleting...' : 'Yes, delete'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)} className="text-red-600 border-red-200 hover:bg-red-50">
      <Trash2 className="h-4 w-4 mr-1" /> Delete
    </Button>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { markTaskBilledAction } from '@/lib/actions/tasks';
import { Check, RotateCcw } from 'lucide-react';

export default function BillingActions({ taskId, billed, billReference }: { taskId: string; billed: boolean; billReference: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markBilled() {
    startTransition(async () => {
      const r = await markTaskBilledAction(taskId);
      if (r.success) {
        toast.success('Marked as billed');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  // Actually updateTaskBillingAction doesn't set billed=true. I need a dedicated action.
  // Let me create markTaskBilledAction in tasks.ts.

  return (
    <Button
      variant={billed ? "ghost" : "outline"}
      size="sm"
      onClick={markBilled}
      disabled={pending || billed}
      className={billed ? 'text-emerald-700' : 'text-zinc-700'}
    >
      {billed ? <><Check className="h-3 w-3 mr-1" /> Billed</> : 'Mark billed'}
    </Button>
  );
}

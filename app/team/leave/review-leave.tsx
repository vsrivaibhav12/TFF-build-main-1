'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { reviewLeaveAction } from '@/lib/actions/leave';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

export default function ReviewLeave({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  function decide(approve: boolean) {
    startTransition(async () => {
      const r = await reviewLeaveAction({ id, approve });
      if (r.success) toast.success(approve ? 'Approved' : 'Rejected');
      else toast.error(r.error);
    });
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => decide(true)} disabled={pending} data-testid={`leave-approve-${id}`}><Check className="h-3 w-3" /></Button>
      <Button size="sm" variant="outline" onClick={() => decide(false)} disabled={pending} data-testid={`leave-reject-${id}`}><X className="h-3 w-3" /></Button>
    </div>
  );
}

'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { setTaskBlockedOnClientAction } from '@/lib/actions/task-flags';

export default function BlockedOnClientToggle({
  taskId,
  isBlocked,
}: {
  taskId: string;
  isBlocked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      const r = await setTaskBlockedOnClientAction({
        task_id: taskId,
        is_blocked_on_client: next,
      });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(next ? 'Marked as awaiting client' : 'Client block cleared');
        router.refresh();
      }
    });
  }

  return (
    <div
      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
      data-testid="blocked-on-client-row"
    >
      <div className="flex items-center gap-3">
        <Inbox className="h-4 w-4 text-zinc-400" />
        <div>
          <div className="text-sm font-medium">Awaiting the client</div>
          <p className="text-xs text-zinc-500">
            Turn on if we&apos;re waiting on documents or clarification. The client portal
            will show this task as &ldquo;Awaiting your data&rdquo;.
          </p>
        </div>
      </div>
      <Switch
        checked={isBlocked}
        onCheckedChange={toggle}
        disabled={pending}
        data-testid="blocked-on-client-switch"
      />
    </div>
  );
}

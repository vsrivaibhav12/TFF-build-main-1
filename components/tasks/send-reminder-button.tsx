'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { sendTaskReminderAction } from '@/lib/actions/tasks';

export default function SendReminderButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const r = await sendTaskReminderAction({ task_id: taskId, message: message || undefined });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      const recipients = (r as any).data?.recipients ?? 0;
      toast.success(
        recipients > 0
          ? `Reminder sent to ${recipients} recipient${recipients === 1 ? '' : 's'}.`
          : 'Reminder logged (no client portal users linked).',
      );
      setOpen(false);
      setMessage('');
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
        data-testid="send-reminder-open"
      >
        <Bell className="h-3.5 w-3.5" /> Send reminder to client
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 space-y-3 bg-zinc-50/40">
      <Label className="text-sm">Message to the client (optional)</Label>
      <Textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. We need the May purchase invoices to file the return on time."
        data-testid="send-reminder-message"
      />
      <div className="flex gap-2">
        <Button onClick={send} disabled={pending} size="sm" data-testid="send-reminder-submit">
          {pending ? 'Sending…' : 'Send reminder'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        Reminders are limited to once every 6 hours per task.
      </p>
    </div>
  );
}

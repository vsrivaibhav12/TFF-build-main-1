'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addTaskNoteAction } from '@/lib/actions/tasks';

export default function ClientNoteForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState('');
  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addTaskNoteAction({ task_id: taskId, body: body.trim() });
      if (!r.success) toast.error(r.error);
      else { toast.success('Reply sent'); setBody(''); router.refresh(); }
    });
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Reply or upload context…" data-testid="client-note-textarea" />
      <Button onClick={send} disabled={!body.trim() || pending} data-testid="client-note-send">Send reply</Button>
    </div>
  );
}

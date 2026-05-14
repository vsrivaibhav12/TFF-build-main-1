'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { replyQueryAction, closeQueryAction } from '@/lib/actions/queries';

export default function QueryReply({ queryId, canClose, canActAsTeam }: { queryId: string; canClose: boolean; canActAsTeam?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');

  function send() {
    if (!msg.trim()) return;
    startTransition(async () => {
      const r = await replyQueryAction({ query_id: queryId, message: msg.trim() });
      if (!r.success) toast.error(r.error);
      else { toast.success('Reply sent'); setMsg(''); router.refresh(); }
    });
  }
  function close() {
    if (!confirm('Mark this query as resolved?')) return;
    startTransition(async () => {
      const r = await closeQueryAction({ query_id: queryId, resolution_notes: msg.trim() || undefined });
      if (!r.success) toast.error(r.error);
      else { toast.success('Query resolved'); setMsg(''); router.refresh(); }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Type your reply…" data-testid="reply-textarea" />
      <div className="flex gap-2">
        <Button onClick={send} disabled={pending || !msg.trim()} data-testid="reply-send">Send reply</Button>
        {canActAsTeam && canClose && <Button variant="outline" onClick={close} disabled={pending}>Mark resolved</Button>}
      </div>
    </div>
  );
}

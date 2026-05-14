'use client';
import { useState, useTransition } from 'react';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { revealCredentialAction } from '@/lib/actions/credentials';
import { toast } from 'sonner';

export default function CredentialReveal({ id }: { id: string }) {
  const [shown, setShown] = useState<{ password: string; security_answer: string | null } | null>(null);
  const [pending, startTransition] = useTransition();
  function reveal() {
    if (shown) { setShown(null); return; }
    startTransition(async () => {
      const r = await revealCredentialAction(id);
      if (r.success) {
        setShown((r as any).data);
        toast.success('Revealed (audit logged)');
        setTimeout(() => setShown(null), 60_000); // auto-hide after 60s
      } else toast.error(r.error);
    });
  }
  function copyPwd() {
    if (!shown?.password) return;
    navigator.clipboard.writeText(shown.password);
    toast.success('Password copied');
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={reveal} disabled={pending} data-testid={`cred-reveal-${id}`} className="text-xs text-teal-700 hover:underline inline-flex items-center gap-1">
        {shown ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Reveal</>}
      </button>
      {shown && (
        <>
          <span className="font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded">{shown.password}</span>
          <button onClick={copyPwd} className="text-zinc-500 hover:text-teal-700"><Copy className="h-3 w-3" /></button>
        </>
      )}
    </span>
  );
}

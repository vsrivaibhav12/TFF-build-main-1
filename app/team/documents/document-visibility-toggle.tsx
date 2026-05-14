'use client';
import { useTransition, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { setDocumentVisibilityAction } from '@/lib/actions/documents';
import { toast } from 'sonner';

export default function DocumentVisibilityToggle({ id, initial }: { id: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  function toggle(v: boolean) {
    setOn(v);
    startTransition(async () => {
      const r = await setDocumentVisibilityAction({ id, visible_to_client: v });
      if (!r.success) { setOn(!v); toast.error(r.error); }
    });
  }
  return <Switch checked={on} onCheckedChange={(v) => toggle(!!v)} disabled={pending} data-testid={`doc-visibility-${id}`} />;
}

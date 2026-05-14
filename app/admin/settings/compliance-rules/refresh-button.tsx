'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { refreshAllComplianceEventsAction } from '@/lib/actions/compliance-calendar';

export default function RefreshEventsBtn() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function refresh() {
    startTransition(async () => {
      const r = await refreshAllComplianceEventsAction();
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`Refreshed · ${(r as any).data?.generated ?? 0} events`);
        router.refresh();
      }
    });
  }
  return (
    <Button variant="outline" onClick={refresh} disabled={pending} data-testid="refresh-events">
      <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
      {pending ? 'Refreshing…' : 'Refresh calendar'}
    </Button>
  );
}

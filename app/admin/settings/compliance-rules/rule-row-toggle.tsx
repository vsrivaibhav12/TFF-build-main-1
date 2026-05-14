'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { toggleComplianceRuleActiveAction } from '@/lib/actions/compliance-calendar';

export default function RuleRowToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function toggle(next: boolean) {
    startTransition(async () => {
      const r = await toggleComplianceRuleActiveAction({ id, is_active: next });
      if (!r.success) toast.error(r.error);
      else { toast.success(next ? 'Rule enabled' : 'Rule disabled'); router.refresh(); }
    });
  }
  return <Switch checked={isActive} onCheckedChange={toggle} disabled={pending} data-testid={`rule-toggle-${id}`} />;
}

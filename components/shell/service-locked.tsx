import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceKind } from '@/lib/auth/service-applicability';

const KIND_LABEL: Record<ServiceKind, string> = {
  gst: 'GST',
  tds: 'TDS',
  income_tax: 'Income Tax',
  compliance: 'Compliance',
  bizlens: 'BizLens analytics',
  vcfo: 'vCFO advisory',
  notice: 'Notice handling',
  payroll: 'Payroll',
  other: 'this service',
};

/**
 * Friendly module-locked screen shown when a team-side data-entry surface is
 * accessed for a client that doesn't subscribe to the right service kind.
 * Provides a deep-link to the client services screen so admins can subscribe.
 */
export default function ServiceLocked({
  kind,
  clientId,
  clientName,
  moduleLabel,
  role = 'team',
}: {
  kind: ServiceKind;
  clientId: string;
  clientName: string;
  moduleLabel: string;
  role?: 'admin' | 'team';
}) {
  const basePath = role === 'admin' ? '/admin' : '/team';
  return (
    <div
      className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center max-w-2xl mx-auto"
      data-testid="service-locked"
    >
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white border border-zinc-200">
        <Lock className="h-5 w-5 text-zinc-400" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">
        {moduleLabel} isn&apos;t enabled for {clientName}
      </h2>
      <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
        Subscribe this client to a service of kind <strong>{KIND_LABEL[kind]}</strong>{' '}
        to unlock this module. You&apos;ll be able to enter data here as soon as
        the subscription is active.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`${basePath}/clients/${clientId}`}>Back to client</Link>
        </Button>
        <Button asChild data-testid="service-locked-subscribe">
          <Link href={`/admin/clients/${clientId}`}>Manage services</Link>
        </Button>
      </div>
    </div>
  );
}

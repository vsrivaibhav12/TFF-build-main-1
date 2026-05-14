import { ensureModuleVisible } from '@/lib/auth/portal-visibility';
import { listAllNotices } from '@/lib/repositories/notices';
import { Badge } from '@/components/ui/badge';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';
import { ScrollText } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function PortalNoticesPage() {
  await ensureModuleVisible('portal.notices');
  const items = await listAllNotices();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="tff-page-title">Notices</h1>
        <p className="tff-page-subtitle">Notices addressed to your business and the engagement team&apos;s response status.</p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No notices yet"
          body="Any government or regulatory notices will appear here once received."
          icon={<ScrollText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white divide-y">
          {items.map((n: any) => (
            <div key={n.id} className="p-5" data-testid={`portal-notice-${n.id}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{n.notice_type}</Badge>
                {n.notice_number && <span className="font-mono text-xs text-zinc-500">{n.notice_number}</span>}
                <Badge variant={n.status === 'closed' ? 'success' : 'warning'} className="ml-auto">{n.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="mt-2 font-medium">{n.subject ?? '—'}</div>
              <div className="mt-1 text-xs text-zinc-500">Due {formatDateIST(n.due_date)} · {formatCurrencyINR(n.amount_involved, { compact: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

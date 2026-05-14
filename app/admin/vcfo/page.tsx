import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyINR } from '@/lib/utils';
import { TrendingUp, ArrowUpRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function AdminVcfoPage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: snapshots } = await sb
    .from('vcfo_snapshots')
    .select('id, client_id, month, year, cash_in_bank, monthly_burn, clients(business_name)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(50);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">vCFO Portfolio</h1>
          <p className="tff-page-subtitle">High-level liquidity and burn-rate monitoring for advisory clients.</p>
        </div>
      </div>

      {(!snapshots || snapshots.length === 0) ? (
        <EmptyState
          title="No vCFO snapshots"
          body="vCFO snapshots will appear here once advisory data is recorded for clients."
          icon={<BarChart3 className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((s: any) => (
            <Link
              key={s.id}
              href={`/admin/vcfo/${s.client_id}`}
              className="tff-card-interactive p-5 group block"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                </div>
                <Badge variant="outline">
                  {new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                </Badge>
              </div>

              <div className="mt-4">
                <h3 className="tff-subsection truncate">{(s.clients as any)?.business_name}</h3>
                <p className="tff-caption mt-0.5">vCFO snapshot</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="tff-kpi-label">Cash</div>
                  <div className="tff-kpi-value mt-1">{formatCurrencyINR(s.cash_in_bank)}</div>
                </div>
                <div>
                  <div className="tff-kpi-label">Monthly burn</div>
                  <div className="tff-kpi-value mt-1 text-red-600">{formatCurrencyINR(s.monthly_burn)}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm font-medium text-teal-700 group-hover:text-teal-800">
                <span>Open advisory hub</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

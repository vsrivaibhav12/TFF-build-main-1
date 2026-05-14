import { ensureModuleVisible } from '@/lib/auth/portal-visibility';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyINR, formatDateIST } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortalVcfoPage() {
  await ensureModuleVisible('portal.vcfo');
  const sb = createClient();
  const { data: snapshots } = await sb
    .from('vcfo_snapshots')
    .select('id, month, year, cash_in_bank, monthly_burn, revenue, budgeted_revenue, budgeted_expenses, actual_revenue, actual_expenses, advisor_notes, updated_at')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(6);
  const latest = (snapshots ?? [])[0] as any;
  const runway = latest?.cash_in_bank && latest?.monthly_burn ? Math.round((latest.cash_in_bank / latest.monthly_burn) * 10) / 10 : null;

  const revVariance = latest?.budgeted_revenue && latest?.actual_revenue
    ? Math.round(((latest.actual_revenue - latest.budgeted_revenue) / latest.budgeted_revenue) * 100)
    : null;
  const expVariance = latest?.budgeted_expenses && latest?.actual_expenses
    ? Math.round(((latest.actual_expenses - latest.budgeted_expenses) / latest.budgeted_expenses) * 100)
    : null;

  return (
    <div className="space-y-8">
      <div><h1 className="tff-page-title">vCFO</h1><p className="tff-page-subtitle">Your runway, monthly burn, budget variance and advisor notes.</p></div>
      {!latest ? (
        <div className="rounded-xl border border-zinc-200 p-8 bg-zinc-50 text-sm text-zinc-500">Your engagement team will publish the first vCFO snapshot here.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Cash in bank" value={formatCurrencyINR(latest.cash_in_bank)} />
            <Stat label="Monthly burn" value={formatCurrencyINR(latest.monthly_burn)} />
            <Stat label="Runway" value={runway !== null ? `${runway} months` : '—'} highlight />
          </div>

          {(revVariance !== null || expVariance !== null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revVariance !== null && (
                <VarianceCard
                  label="Revenue vs budget"
                  variance={revVariance}
                  actual={latest.actual_revenue}
                  budgeted={latest.budgeted_revenue}
                />
              )}
              {expVariance !== null && (
                <VarianceCard
                  label="Expenses vs budget"
                  variance={expVariance}
                  actual={latest.actual_expenses}
                  budgeted={latest.budgeted_expenses}
                  inverse
                />
              )}
            </div>
          )}

          {latest.advisor_notes && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <div className="text-sm font-semibold mb-1">Advisor notes · {latest.month}/{latest.year}</div>
              <div className="text-sm text-zinc-700">{latest.advisor_notes}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-xl border p-6 ${highlight ? 'border-teal-200 bg-teal-50' : 'border-zinc-200 bg-white'}`}><div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div><div className={`mt-2 text-2xl font-semibold tabular-nums ${highlight ? 'text-teal-800' : 'text-zinc-900'}`}>{value}</div></div>;
}

function VarianceCard({ label, variance, actual, budgeted, inverse }: { label: string; variance: number; actual: number; budgeted: number; inverse?: boolean }) {
  const isGood = inverse ? variance < 0 : variance > 0;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-2xl font-semibold tabular-nums ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
          {variance > 0 ? '+' : ''}{variance}%
        </span>
        {isGood ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-rose-500" />}
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        Actual {formatCurrencyINR(actual)} vs budgeted {formatCurrencyINR(budgeted)}
      </div>
    </div>
  );
}

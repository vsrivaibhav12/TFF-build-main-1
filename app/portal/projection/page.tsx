import { ensureModuleVisible } from '@/lib/auth/portal-visibility';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { computeProjectedTax, advanceTaxSchedule } from '@/lib/services/tax-projection';
import { formatCurrencyINR } from '@/lib/utils';
import { Calculator } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function PortalProjectionPage() {
  await ensureModuleVisible('portal.tax_projection');
  const sb = createClient();
  const fy = new Date().getFullYear();
  const { data } = await sb
    .from('compliance_insights')
    .select('headline, narrative, raw_value, benchmark_value, recommended_action, created_at, period_year')
    .eq('insight_type', 'other')
    .eq('period_year', fy)
    .order('created_at', { ascending: false })
    .maybeSingle();

  const gross = (data as any)?.raw_value ?? 0;
  const tdsPaid = (data as any)?.benchmark_value ?? 0;
  const t = computeProjectedTax(gross, 0);
  const sched = advanceTaxSchedule(t.tax);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="tff-page-title">Tax projection</h1>
        <p className="tff-page-subtitle">Estimated annual liability and advance-tax schedule. Updated by your engagement team.</p>
      </div>
      {!data ? (
        <EmptyState
          title="No projection yet"
          body={`Your engagement team will upload the tax projection for FY ${fy} shortly.`}
          icon={<Calculator className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card label="Projected gross" value={formatCurrencyINR(gross)} />
            <Card label="Projected tax" value={formatCurrencyINR(t.tax)} />
            <Card label="TDS paid" value={formatCurrencyINR(tdsPaid)} />
            <Card label="Net due" value={formatCurrencyINR(Math.max(0, t.tax - tdsPaid))} highlight />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-base font-semibold mb-4">Advance tax schedule</h3>
            <div className="divide-y divide-zinc-100">
              {sched.map((s) => (
                <div key={s.instalment} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2"><Badge variant="outline">{s.percent}%</Badge><span>{s.instalment}</span></div>
                  <div className="font-mono tabular-nums">{formatCurrencyINR(s.amount)}</div>
                </div>
              ))}
            </div>
          </div>
          {(data as any).recommended_action && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-zinc-700">
              <div className="font-semibold mb-1">Notes from your team</div>
              {(data as any).recommended_action}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-xl border p-6 ${highlight ? 'border-teal-200 bg-teal-50' : 'border-zinc-200 bg-white'}`}><div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div><div className={`mt-2 text-2xl font-semibold tabular-nums ${highlight ? 'text-teal-800' : 'text-zinc-900'}`}>{value}</div></div>;
}

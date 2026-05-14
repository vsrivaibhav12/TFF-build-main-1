import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientById } from '@/lib/repositories/clients';
import { listVcfoSnapshots, listSolutionLog } from '@/lib/repositories/vcfo';
import { clientHasServiceKind } from '@/lib/auth/service-applicability';
import VcfoForm from '@/components/operations/vcfo/vcfo-form';
import SolutionForm from '@/components/operations/vcfo/solution-form';
import ServiceLocked from '@/components/shell/service-locked';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyINR, formatDateIST } from '@/lib/utils';
import { ChevronLeft, TrendingUp, Landmark, ShieldCheck, Zap, Lightbulb } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import LineChart from '@/components/charts/line-chart';
import SolutionStatusUpdater from '@/components/operations/vcfo/solution-status-updater';

export const dynamic = 'force-dynamic';

export default async function AdminVcfoClientPage({ params }: { params: { clientId: string } }) {
  const client = await getClientById(params.clientId);
  if (!client) notFound();

  const allowed = await clientHasServiceKind(params.clientId, 'vcfo');
  if (!allowed) {
    return (
      <div className="tff-stack">
        <Link href="/admin/vcfo" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ChevronLeft className="h-4 w-4" /> Back to vCFO portfolio
        </Link>
        <ServiceLocked kind="vcfo" clientId={params.clientId} clientName={(client as any).business_name} moduleLabel="vCFO Advisory" />
      </div>
    );
  }

  const [snapshots, solutions] = await Promise.all([listVcfoSnapshots(params.clientId), listSolutionLog(params.clientId)]);
  const latest: any = snapshots[0];
  const runwayMonths = latest?.cash_in_bank && latest?.monthly_burn ? Math.round((latest.cash_in_bank / latest.monthly_burn) * 10) / 10 : null;
  const variance = latest?.budgeted_revenue && latest?.actual_revenue ? Math.round(((latest.actual_revenue - latest.budgeted_revenue) / latest.budgeted_revenue) * 100) : null;

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <Link href="/admin/vcfo" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
            <ChevronLeft className="h-4 w-4" /> Back to vCFO portfolio
          </Link>
          <h1 className="tff-page-title">vCFO advisory</h1>
          <p className="tff-page-subtitle">Financial health, cash runway and strategic recommendations.</p>
        </div>
        <VcfoForm clientId={params.clientId} latest={latest} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Cash in bank" value={latest ? formatCurrencyINR(latest.cash_in_bank) : '—'} icon={<Landmark className="h-4 w-4" />} />
        <MetricCard label="Monthly burn" value={latest ? formatCurrencyINR(latest.monthly_burn) : '—'} icon={<Zap className="h-4 w-4" />} />
        <MetricCard label="Runway" value={runwayMonths !== null ? `${runwayMonths} months` : '—'} icon={<ShieldCheck className="h-4 w-4" />} highlight />
        <MetricCard label="Revenue vs plan" value={variance !== null ? `${variance > 0 ? '+' : ''}${variance}%` : '—'} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 tff-stack">
          <div className="flex items-center justify-between">
            <h2 className="tff-section-title">Solution log</h2>
            <SolutionForm clientId={params.clientId} />
          </div>

          {solutions.length === 0 ? (
            <EmptyState
              title="No advisory entries"
              body="Advisory recommendations and solutions will appear here once recorded."
              icon={<Lightbulb className="h-6 w-6 text-zinc-400" />}
            />
          ) : (
            <div className="tff-stack-sm">
              {solutions.map((s: any) => (
                <div key={s.id} className="tff-card p-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="outline">{s.issue_category}</Badge>
                    <SolutionStatusUpdater id={s.id} current={s.solution_status} />
                  </div>
                  <h3 className="tff-subsection mt-3">{s.issue_description}</h3>
                  <div className="mt-3 p-3 rounded-md bg-teal-50/60 border border-teal-100 text-sm text-zinc-700 leading-relaxed">
                    <strong className="text-teal-800 block mb-0.5">Recommendation:</strong>
                    {s.recommended_solution}
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100">
                    <span>Identified {formatDateIST(s.issue_identified_date)}</span>
                    {s.financial_impact_estimate != null && (
                      <span className="text-teal-700 font-medium">Impact: {formatCurrencyINR(s.financial_impact_estimate)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="tff-stack">
          {snapshots.length >= 2 ? (
            <div className="tff-card p-5 space-y-4">
              <h3 className="tff-subsection">Historical trend</h3>
              {(() => {
                const sorted = [...snapshots].sort((a: any, b: any) => {
                  if (a.year !== b.year) return a.year - b.year;
                  return a.month - b.month;
                });
                const labels = sorted.map((s: any) => `${s.month.toString().padStart(2, '0')}/${s.year}`);
                const burn = sorted.map((s: any) => s.monthly_burn || 0);
                const runway = sorted.map((s: any) => (s.cash_in_bank && s.monthly_burn > 0 ? Math.round((s.cash_in_bank / s.monthly_burn) * 10) / 10 : 0));
                return (
                  <LineChart categories={labels} series={[
                    { name: 'Monthly burn', data: burn, color: '#EF4444' },
                    { name: 'Runway (months)', data: runway, color: '#0D9488' },
                  ]} height={240} />
                );
              })()}
            </div>
          ) : (
            <div className="tff-card p-5">
              <h3 className="tff-subsection">Historical trend</h3>
              <p className="tff-muted mt-1">Visual trends for burn and runway will appear here as more snapshots are added.</p>
              <div className="mt-4 h-32 bg-zinc-50 rounded-md border border-dashed border-zinc-200 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-zinc-300" />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`tff-card p-5 ${highlight ? 'border-teal-200 bg-teal-50/40' : ''}`}>
      <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-3 ${highlight ? 'bg-teal-100 text-teal-700' : 'bg-zinc-100 text-zinc-500'}`}>
        {icon}
      </div>
      <div className="tff-kpi-label">{label}</div>
      <div className={`mt-1 tff-kpi-value ${highlight ? 'text-teal-800' : ''}`}>{value}</div>
    </div>
  );
}

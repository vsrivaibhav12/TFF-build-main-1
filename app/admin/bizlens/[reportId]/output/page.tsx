import { notFound } from 'next/navigation';
import { getBizlensReport } from '@/lib/actions/bizlens-actions';
import {
  computeReport, generateInsights, generateExecutiveSummary,
  computeBizLensScore, computeWCCycle, computeBreakEvenDays,
  computeDebtFreedom, generateOpportunities, computeTrends, computeFutureProjections,
} from '@/lib/services/bizlens-service';
import { getClientById } from '@/lib/repositories/clients';
import { listBizlensSnapshots } from '@/lib/repositories/bizlens-snapshots';
import BizlensOutputDashboard from '@/components/bizlens/output-dashboard';
import Link from 'next/link';
import { ChevronLeft, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BizlensOutputPage({
  params,
}: {
  params: { reportId: string };
}) {
  const data = await getBizlensReport(params.reportId);
  if (!data) notFound();

  const client = await getClientById(data.client_id);
  if (!client) notFound();

  // Empty-state guard
  const isEmpty = !data.sales_revenue && !data.fixed_costs && !data.variable_costs;
  if (isEmpty) {
    return (
      <div className="tff-card p-10 text-center">
        <div className="w-12 h-12 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-5 w-5 text-teal-600" />
        </div>
        <h2 className="tff-section-title">No data captured yet</h2>
        <p className="tff-muted mt-1 max-w-md mx-auto">
          The diagnostic needs financial inputs. Complete the P&amp;L and balance sheet sections to generate insights.
        </p>
        <Link
          href={`/admin/bizlens/${params.reportId}/input`}
          className="inline-flex items-center mt-5 h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors tff-focus"
        >
          Enter financials
        </Link>
      </div>
    );
  }

  const report = computeReport(data);
  const insights = generateInsights(report);
  const summary = generateExecutiveSummary(report, insights, {}, (client as any).business_name);
  const score = computeBizLensScore(report);
  const wcc = computeWCCycle(report, { INTm: report.monthly.INTm });
  const breakEven = computeBreakEvenDays(report);
  const debtFreedom = computeDebtFreedom(report);
  const opportunities = generateOpportunities(report);

  // Prior periods for trends
  const snapshots = await listBizlensSnapshots(data.client_id);
  const priorReports = snapshots
    .filter(s => s.data && typeof s.data === 'object')
    .map(s => computeReport({
      client_id: data.client_id,
      period_year: s.period_year,
      period_month: s.period_month,
      months_covered: s.months_covered,
      ...s.data,
    } as any));
  const trends = computeTrends(report, priorReports);
  const projections = computeFutureProjections(report, priorReports);

  return (
    <div className="tff-stack-lg pb-20">
      <div className="flex items-center justify-between">
        <Link href="/admin/bizlens" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ChevronLeft className="h-4 w-4" /> Back to BizLens
        </Link>
        <div className="text-right">
          <div className="text-sm font-medium text-zinc-900">{(client as any).business_name}</div>
          <div className="tff-caption">Report {params.reportId.slice(0, 8)}</div>
        </div>
      </div>

      <BizlensOutputDashboard
        data={data}
        report={report}
        insights={insights}
        summary={summary!}
        score={score!}
        wcc={wcc}
        breakEven={breakEven}
        debtFreedom={debtFreedom}
        opportunities={opportunities}
        clientId={data.client_id}
        role="admin"
        trends={trends}
        projections={projections}
      />
    </div>
  );
}

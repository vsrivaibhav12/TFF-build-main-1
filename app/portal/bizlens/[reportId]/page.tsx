import { getBizlensReport } from '@/lib/actions/bizlens-actions';
import {
  computeReport, generateInsights, generateExecutiveSummary,
  computeBizLensScore, computeWCCycle, computeBreakEvenDays,
  computeDebtFreedom, generateOpportunities,
} from '@/lib/services/bizlens-service';
import BizlensOutputDashboard from '@/components/bizlens/output-dashboard';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PortalBizlensReportPage({
  params,
}: {
  params: { reportId: string };
}) {
  await requireRole('client');
  const sb = createClient();
  const { data: cu } = await sb
    .from('client_users')
    .select('client_id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const clientId = (cu as any)?.client_id ?? null;
  if (!clientId) notFound();

  const data = await getBizlensReport(params.reportId);
  
  // Security check: ensure report belongs to client
  if (data.client_id !== clientId) notFound();
  // Security check: ensure report is published
  if (data.status !== 'published') notFound();

  // We need the client name for the summary
  const { data: client } = await sb.from('clients').select('business_name').eq('id', clientId).single();
  
  const report = computeReport(data);
  const insights = generateInsights(report);
  const summary = generateExecutiveSummary(report, insights, {}, (client as any)?.business_name);
  const score = computeBizLensScore(report);
  const wcc = computeWCCycle(report, { INTm: report.monthly.INTm });
  const breakEven = computeBreakEvenDays(report);
  const debtFreedom = computeDebtFreedom(report);
  const opportunities = generateOpportunities(report);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="tff-page-title">
          {new Date(data.period_year, (data.period_month || 1) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Report
        </h1>
        <p className="tff-page-subtitle">{(client as any)?.business_name}</p>
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
        clientId={clientId}
        isPortal={true}
      />
    </div>
  );
}

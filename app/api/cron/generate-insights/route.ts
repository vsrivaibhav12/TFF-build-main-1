import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { computeInsightsForClient } from '@/lib/services/insight-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Weekly insight generation — Sunday 22:00 IST. For every active client,
 * compute insights and persist any new critical/warning ones to compliance_insights
 * for historical record. Uses service-role client to bypass RLS for cross-client work.
 */
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron');
  const secret = request.nextUrl.searchParams.get('secret');
  if (!isCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = createServiceClient();
  const { data: clients } = await sb.from('clients').select('id').eq('is_deleted', false);
  let total = 0;
  for (const c of clients ?? []) {
    const insights = await computeInsightsForClient((c as any).id);
    for (const i of insights) {
      if (i.severity === 'info') continue;
      await sb.from('compliance_insights').insert({
        client_id: (c as any).id,
        insight_type: i.rule.includes('itc') ? 'itc_utilization_gap' : i.rule.includes('gst_rate') ? 'gst_rate_vs_industry' : i.rule.includes('timeliness') ? 'filing_timeliness' : i.rule.includes('tds') ? 'tds_concentration_risk' : 'other',
        headline: i.headline,
        narrative: i.narrative,
        raw_value: i.raw_value ?? null,
        benchmark_value: i.benchmark_value ?? null,
        severity: i.severity,
        recommended_action: i.recommended_action ?? null,
      });
      total++;
    }
  }
  return NextResponse.json({ clients: (clients ?? []).length, insights_recorded: total });
}

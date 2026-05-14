import { listGstFilings, listTdsFilings, listItFilings } from '@/lib/repositories/compliance';

export interface ComplianceBreakdown {
  overall: number;
  gst: { filed: number; total: number; score: number };
  tds: { filed: number; total: number; score: number };
  it: { filed: number; total: number; score: number };
}

export async function computeComplianceScore(clientId: string): Promise<ComplianceBreakdown> {
  const [gst, tds, it] = await Promise.all([
    listGstFilings(clientId),
    listTdsFilings(clientId),
    listItFilings(clientId),
  ]);

  // GST: count filings in last 12 months that are filed
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const recentGst = (gst as any[]).filter((f: any) => {
    const d = new Date(f.period_year, f.period_month - 1, 1);
    return d >= twelveMonthsAgo;
  });
  const gstFiled = recentGst.filter((f: any) => f.status === 'filed').length;
  const gstTotal = recentGst.length || 1; // avoid div/0

  // TDS: last 4 quarters
  const recentTds = (tds as any[]).filter((f: any) => {
    const qYear = f.period_year;
    const qNum = f.period_quarter;
    // Approximate: Q1=Apr-Jun year-1, Q4=Jan-Mar year
    const qEndMonth = qNum * 3;
    const d = new Date(qYear, qEndMonth - 1, 1);
    return d >= twelveMonthsAgo;
  });
  const tdsFiled = recentTds.filter((f: any) => f.status === 'filed').length;
  const tdsTotal = recentTds.length || 1;

  // IT: last 2 FYs
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const recentIt = (it as any[]).filter((f: any) => f.fy_ending_year >= currentFY - 1);
  const itFiled = recentIt.filter((f: any) => f.status === 'filed').length;
  const itTotal = recentIt.length || 1;

  const gstScore = Math.round((gstFiled / gstTotal) * 100);
  const tdsScore = Math.round((tdsFiled / tdsTotal) * 100);
  const itScore = Math.round((itFiled / itTotal) * 100);

  // Weighted: GST 50%, TDS 30%, IT 20%
  const overall = Math.round(gstScore * 0.5 + tdsScore * 0.3 + itScore * 0.2);

  return {
    overall,
    gst: { filed: gstFiled, total: gstTotal, score: gstScore },
    tds: { filed: tdsFiled, total: tdsTotal, score: tdsScore },
    it: { filed: itFiled, total: itTotal, score: itScore },
  };
}

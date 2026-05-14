import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface InsightOutput {
  rule: string;
  headline: string;
  narrative: string;
  severity: 'info' | 'warning' | 'critical';
  raw_value?: number;
  benchmark_value?: number;
  recommended_action?: string;
}

/**
 * Insight Engine v0 — 5 rules. Computes on demand from existing facts.
 * RLS scopes the inputs automatically; insights are not stored unless explicitly
 * persisted to compliance_insights via a separate action.
 */
export async function computeInsightsForClient(clientId: string): Promise<InsightOutput[]> {
  const sb = createClient();
  const out: InsightOutput[] = [];

  // Rule 1: ITC utilisation gap (claimed vs available, last 6 months avg)
  {
    const { data } = await sb
      .from('gst_data_entries')
      .select('input_tax_2b, itc_books')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(6);
    if (data && data.length > 0) {
      const claimed = data.reduce((s: number, r: any) => s + (r.itc_books ?? 0), 0);
      const available = data.reduce((s: number, r: any) => s + (r.input_tax_2b ?? 0), 0);
      const gap = available > 0 ? (1 - claimed / available) * 100 : 0;
      if (available > 0 && gap > 5) {
        out.push({
          rule: 'itc_utilization_gap',
          headline: 'ITC under-utilisation',
          narrative: `Over the last ${data.length} months, you claimed only ₹${Math.round(claimed).toLocaleString('en-IN')} of ₹${Math.round(available).toLocaleString('en-IN')} ITC available in 2B (${gap.toFixed(1)}% gap).`,
          severity: gap > 15 ? 'critical' : 'warning',
          raw_value: claimed,
          benchmark_value: available,
          recommended_action: 'Reconcile vendor invoices and supplier 2B to recover unclaimed ITC.',
        });
      }
    }
  }

  // Rule 2: Effective GST rate vs own historical average (minimum 3 periods)
  {
    const { data } = await sb
      .from('gst_data_entries')
      .select('turnover, output_tax_cgst, output_tax_sgst, output_tax_igst')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .limit(12);
    if (data && data.length >= 3) {
      const rates = data.map((r: any) => {
        const t = (r.turnover ?? 0);
        const tx = (r.output_tax_cgst ?? 0) + (r.output_tax_sgst ?? 0) + (r.output_tax_igst ?? 0);
        return t > 0 ? (tx / t) * 100 : 0;
      }).filter((r: number) => r > 0);
      if (rates.length >= 3) {
        const latestRate = rates[0];
        const benchmark = rates.reduce((s: number, r: number) => s + r, 0) / rates.length;
        if (Math.abs(latestRate - benchmark) > 2) {
          out.push({
            rule: 'gst_rate_vs_historical',
            headline: latestRate < benchmark ? 'Effective GST rate below your historical average' : 'Effective GST rate above your historical average',
            narrative: `Latest effective GST rate is ${latestRate.toFixed(1)}% vs your ${data.length}-period average of ${benchmark.toFixed(1)}%.`,
            severity: 'info',
            raw_value: latestRate,
            benchmark_value: benchmark,
            recommended_action: latestRate < benchmark ? 'Review HSN classification and product mix.' : 'Investigate higher tax rate exposure or eligibility for lower rates.',
          });
        }
      }
    }
  }

  // Rule 3: Filing timeliness score (last 6 filings)
  {
    const { data } = await sb
      .from('compliance_status')
      .select('status, is_overdue, due_date, filed_date')
      .eq('client_id', clientId)
      .order('due_date', { ascending: false })
      .limit(6);
    if (data && data.length >= 3) {
      const onTime = data.filter((r: any) => r.status === 'filed' && !r.is_overdue).length;
      const score = Math.round((onTime / data.length) * 100);
      out.push({
        rule: 'filing_timeliness',
        headline: `Filing timeliness ${score}%`,
        narrative: `${onTime} of last ${data.length} filings completed on time.`,
        severity: score >= 90 ? 'info' : score >= 60 ? 'warning' : 'critical',
        raw_value: score,
        benchmark_value: 95,
        recommended_action: score < 90 ? 'Set earlier internal due dates and enable due-date alerts.' : undefined,
      });
    }
  }

  // Rule 4: TDS-to-revenue concentration risk
  {
    const { data } = await sb
      .from('tds_filings')
      .select('total_deductions')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .limit(4);
    const { data: gstData } = await sb
      .from('gst_data_entries')
      .select('turnover')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .limit(12);
    if (data && gstData && data.length > 0 && gstData.length > 0) {
      const tds = data.reduce((s: number, r: any) => s + (r.total_deductions ?? 0), 0);
      const turnover = gstData.reduce((s: number, r: any) => s + (r.turnover ?? 0), 0);
      const ratio = turnover > 0 ? (tds / turnover) * 100 : 0;
      if (ratio > 8) {
        out.push({
          rule: 'tds_concentration_risk',
          headline: 'High TDS-to-revenue ratio',
          narrative: `TDS deductions are ${ratio.toFixed(1)}% of revenue, indicating heavy customer-side withholding.`,
          severity: ratio > 15 ? 'critical' : 'warning',
          raw_value: ratio,
          recommended_action: 'Apply for lower-deduction certificate (Form 13) to improve cash flow.',
        });
      }
    }
  }

  // Rule 5: Advance-tax adequacy (vs latest projection if any)
  {
    const { data } = await sb
      .from('compliance_insights')
      .select('raw_value, benchmark_value')
      .eq('client_id', clientId)
      .eq('insight_type', 'other')
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (data && (data as any).raw_value && (data as any).benchmark_value !== null) {
      const grossIncome = (data as any).raw_value;
      const tdsPaid = (data as any).benchmark_value;
      const proxy = grossIncome * 0.2; // proxy expected tax
      const coverage = proxy > 0 ? (tdsPaid / proxy) * 100 : 0;
      if (coverage < 90) {
        out.push({
          rule: 'advance_tax_adequacy',
          headline: 'Advance tax may be short',
          narrative: `TDS paid covers only ${coverage.toFixed(0)}% of estimated tax liability. Plan instalments to avoid 234C interest.`,
          severity: coverage < 60 ? 'critical' : 'warning',
          raw_value: coverage,
          benchmark_value: 100,
          recommended_action: 'Pay next advance-tax instalment by Q2/Q3 deadline to stay compliant.',
        });
      }
    }
  }

  return out;
}

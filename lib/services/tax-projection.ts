import 'server-only';
import { createClient } from '@/lib/supabase/server';

export { computeProjectedTax, advanceTaxSchedule } from './tax-projection-pure';

export interface TaxProjectionInputs {
  fy_ending_year: number;
  projected_gross_income: number;
  projected_deductions: number;
  projected_tds_paid: number;
  notes?: string;
}

/** Stored as `compliance_insights` rows of type 'other' for now */
export async function getLatestProjection(clientId: string, fyEndingYear: number) {
  const sb = createClient();
  const { data } = await sb
    .from('compliance_insights')
    .select('id, headline, narrative, raw_value, benchmark_value, recommended_action, created_at')
    .eq('client_id', clientId)
    .eq('insight_type', 'other')
    .eq('period_year', fyEndingYear)
    .order('created_at', { ascending: false })
    .maybeSingle();
  return data;
}

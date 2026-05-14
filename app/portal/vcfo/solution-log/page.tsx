import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';
import { Lightbulb, TrendingUp, ShieldCheck, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

const CATEGORY_ICON: Record<string, any> = {
  compliance: ShieldCheck,
  tax_savings: TrendingUp,
  cash_flow: TrendingUp,
  risk_mitigation: ShieldCheck,
  advisory: Lightbulb,
  process_improvement: FileCheck,
  other: FileCheck,
};

const CATEGORY_LABEL: Record<string, string> = {
  compliance: 'Compliance',
  tax_savings: 'Tax savings',
  cash_flow: 'Cash flow',
  risk_mitigation: 'Risk avoided',
  advisory: 'Advisory',
  process_improvement: 'Process improvement',
  other: 'Other',
};

export default async function PortalSolutionLogPage() {
  const me = await requireRole('client');
  const sb = createClient();
  // RLS will scope rows to this client automatically; we still filter explicitly
  // to be safe + take advantage of the index.
  const { data: clients } = await sb
    .from('client_users')
    .select('client_id')
    .eq('user_id', me.id)
    .eq('is_active', true);
  const clientIds = (clients ?? []).map((r: any) => r.client_id);

  const { data: entries } = clientIds.length > 0
    ? await sb
        .from('solution_log')
        .select('id, issue_identified_date, issue_description, issue_category, recommended_solution, actual_outcome, financial_impact_estimate, actual_financial_impact, solution_status, implementation_date, created_at')
        .in('client_id', clientIds)
        .order('issue_identified_date', { ascending: false })
        .limit(200)
    : { data: [] };

  const totalDelivered = (entries ?? [])
    .filter((e: any) => e.solution_status === 'implemented' || e.solution_status === 'monitoring')
    .reduce((s: number, e: any) => s + Number(e.actual_financial_impact ?? e.financial_impact_estimate ?? 0), 0);

  return (
    <div className="space-y-8">
      <Link href="/portal/vcfo" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Back to vCFO
      </Link>
      <div>
        <h1 className="tff-page-title flex items-center gap-2">
          <Lightbulb className="h-7 w-7 text-teal-600" /> What we noticed
        </h1>
        <p className="tff-page-subtitle">
          A running log of issues we caught, fixes we recommended, and outcomes we delivered for your business.
        </p>
      </div>

      {totalDelivered > 0 && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6 text-teal-900">
          <div className="text-xs uppercase tracking-wide text-teal-700">Cumulative value delivered</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrencyINR(totalDelivered)}</div>
          <p className="text-xs text-teal-700 mt-1">Sum of impact across implemented solutions.</p>
        </div>
      )}

      {(entries ?? []).length === 0 ? (
        <EmptyState
          title="No entries yet"
          body="As we work on your compliance, vCFO and advisory matters, everything we catch and resolve will be logged here for transparency."
          icon={<Lightbulb className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <ol className="relative border-l-2 border-zinc-100 ml-3 space-y-6 pt-2">
          {(entries ?? []).map((e: any) => {
            const Icon = CATEGORY_ICON[e.issue_category] ?? Lightbulb;
            return (
              <li key={e.id} className="ml-6">
                <span className="absolute -left-3.5 flex items-center justify-center w-6 h-6 bg-white border-2 border-teal-500 rounded-full">
                  <Icon className="w-3 h-3 text-teal-600" />
                </span>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold">{e.issue_description}</h3>
                    <Badge variant="outline">{CATEGORY_LABEL[e.issue_category] ?? e.issue_category}</Badge>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {formatDateIST(e.issue_identified_date)}
                    {e.solution_status && <span className="ml-2">· status: <strong>{e.solution_status.replace('_', ' ')}</strong></span>}
                  </div>
                  {e.recommended_solution && (
                    <p className="text-sm text-zinc-700 mt-3"><strong>What we recommended:</strong> {e.recommended_solution}</p>
                  )}
                  {e.actual_outcome && (
                    <p className="text-sm text-zinc-700 mt-2"><strong>Outcome:</strong> {e.actual_outcome}</p>
                  )}
                  {(e.actual_financial_impact != null || e.financial_impact_estimate != null) && (
                    <p className="text-xs text-teal-700 mt-3 font-medium">
                      Value: {formatCurrencyINR(Number(e.actual_financial_impact ?? e.financial_impact_estimate))}
                      {e.actual_financial_impact == null && ' (estimated)'}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

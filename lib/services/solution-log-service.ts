import 'server-only';
import { createServiceClient } from '@/lib/supabase/service-role';

/**
 * Solution Log auto-population helpers.
 *
 * Each event (notice close, query close, vCFO snapshot save with material delta,
 * tax-projection finalize) calls one of these wrappers and we insert a
 * `solution_log` row capturing the value delivered. Best-effort — failure to
 * write a log entry must NEVER break the underlying business action, so each
 * helper swallows errors and logs them.
 */

interface BaseEntry {
  clientId: string;
  identifiedBy: string;
  description: string;
  category: 'compliance' | 'tax_savings' | 'cash_flow' | 'risk_mitigation' | 'process_improvement' | 'advisory' | 'other';
  recommendedSolution?: string;
  actualOutcome?: string;
  financialImpactEstimate?: number;
  actualFinancialImpact?: number;
  status?: 'identified' | 'in_progress' | 'implemented' | 'monitoring' | 'closed';
  sourceRecordId?: string;
  sourceRecordType?: string;
}

async function writeSolutionLog(entry: BaseEntry) {
  try {
    const sb = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);
    await sb.from('solution_log').insert({
      client_id: entry.clientId,
      issue_identified_date: today,
      issue_description: entry.description.slice(0, 1000),
      issue_category: entry.category,
      recommended_solution: entry.recommendedSolution?.slice(0, 1000) ?? null,
      actual_outcome: entry.actualOutcome?.slice(0, 1000) ?? null,
      financial_impact_estimate: entry.financialImpactEstimate ?? null,
      actual_financial_impact: entry.actualFinancialImpact ?? null,
      solution_status: entry.status ?? 'implemented',
      implementation_date: entry.status === 'implemented' ? today : null,
      identified_by: entry.identifiedBy,
      implemented_by: entry.status === 'implemented' ? entry.identifiedBy : null,
    });
  } catch (e) {
    // Never block the calling action. Log to server console for ops follow-up.
    console.error('[solution-log] failed to write entry', e);
  }
}

export async function logNoticeClosed(opts: {
  clientId: string;
  identifiedBy: string;
  noticeId: string;
  noticeSubject: string;
  amountInvolved: number | null;
  outcome?: string;
}) {
  await writeSolutionLog({
    clientId: opts.clientId,
    identifiedBy: opts.identifiedBy,
    description: `Notice resolved: ${opts.noticeSubject}`,
    category: 'compliance',
    recommendedSolution: 'Responded to notice and obtained closure',
    actualOutcome: opts.outcome ?? 'Notice closed',
    actualFinancialImpact: opts.amountInvolved ?? undefined,
    status: 'implemented',
    sourceRecordType: 'notice',
    sourceRecordId: opts.noticeId,
  });
}

export async function logQueryResolved(opts: {
  clientId: string;
  identifiedBy: string;
  queryId: string;
  subject: string;
}) {
  await writeSolutionLog({
    clientId: opts.clientId,
    identifiedBy: opts.identifiedBy,
    description: `Client query resolved: ${opts.subject}`,
    category: 'advisory',
    actualOutcome: 'Query addressed and closed',
    status: 'implemented',
    sourceRecordType: 'query',
    sourceRecordId: opts.queryId,
  });
}

export async function logVcfoSnapshot(opts: {
  clientId: string;
  identifiedBy: string;
  snapshotId: string;
  runwayMonths?: number;
  burnDelta?: number;
}) {
  // Only log when there's a material signal worth recording
  if (opts.burnDelta == null && opts.runwayMonths == null) return;
  const pieces: string[] = [];
  if (opts.runwayMonths != null) pieces.push(`runway ${opts.runwayMonths.toFixed(1)} mo`);
  if (opts.burnDelta != null) pieces.push(`burn ${opts.burnDelta >= 0 ? '+' : ''}${opts.burnDelta.toFixed(0)}`);
  await writeSolutionLog({
    clientId: opts.clientId,
    identifiedBy: opts.identifiedBy,
    description: `vCFO snapshot recorded: ${pieces.join(' · ')}`,
    category: 'cash_flow',
    status: 'monitoring',
    sourceRecordType: 'vcfo_snapshot',
    sourceRecordId: opts.snapshotId,
  });
}

export async function logTaxProjectionFinalized(opts: {
  clientId: string;
  identifiedBy: string;
  projectionId: string;
  fy: string;
  estimatedTax: number;
  recommendedAdvanceTax?: number;
}) {
  await writeSolutionLog({
    clientId: opts.clientId,
    identifiedBy: opts.identifiedBy,
    description: `Tax projection finalized for ${opts.fy}`,
    category: 'tax_savings',
    recommendedSolution: opts.recommendedAdvanceTax != null
      ? `Advance tax instalments suggested: Rs.${opts.recommendedAdvanceTax.toFixed(0)}`
      : undefined,
    financialImpactEstimate: opts.estimatedTax,
    status: 'identified',
    sourceRecordType: 'tax_projection',
    sourceRecordId: opts.projectionId,
  });
}

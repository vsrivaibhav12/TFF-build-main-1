import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, RefreshCw, ListChecks } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import RefreshEventsBtn from './refresh-button';
import RuleRowToggle from './rule-row-toggle';

export const dynamic = 'force-dynamic';

export default async function ComplianceRulesPage() {
  const sb = createClient();
  const { data: rules } = await sb
    .from('compliance_calendar_rules')
    .select('id, rule_code, display_name, service_kind, periodicity, due_day, due_month_offset, due_date_formula, applies_when, reminder_days, description, is_active')
    .order('service_kind')
    .order('rule_code');

  const grouped: Record<string, any[]> = {};
  for (const r of rules ?? []) {
    const k = (r as any).service_kind;
    grouped[k] = grouped[k] ?? [];
    grouped[k].push(r);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Settings
      </Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="tff-page-title">Compliance calendar rules</h1>
          <p className="tff-page-subtitle">
            Statutory due-date master. Edits regenerate calendar events for all clients on save.
          </p>
        </div>
        <RefreshEventsBtn />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState title="No compliance rules" body="Compliance calendar rules will appear here once configured. Use the refresh button to generate default rules." icon={<ListChecks className="h-6 w-6 text-zinc-400" />} />
      ) : (Object.entries(grouped).map(([kind, rs]) => (
        <section key={kind} className="space-y-3">
          <h2 className="text-base font-semibold uppercase tracking-wider text-zinc-500">
            {kind}
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white divide-y" data-testid={`rules-${kind}`}>
            {rs.map((r: any) => (
              <div key={r.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-100 rounded px-1.5 py-0.5 text-[11px] font-mono">{r.rule_code}</code>
                    <span className="font-medium">{r.display_name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.periodicity}</Badge>
                    {!r.is_active && <Badge variant="warning" className="text-[10px]">disabled</Badge>}
                  </div>
                  {r.description && <p className="text-sm text-zinc-600 mt-1">{r.description}</p>}
                  <div className="text-xs text-zinc-500 mt-1.5 flex items-center gap-2 flex-wrap">
                    {r.due_day && <span>Day {r.due_day}</span>}
                    {r.due_month_offset > 0 && <span>+{r.due_month_offset}m</span>}
                    {r.due_date_formula && <code className="bg-zinc-50 rounded px-1 text-[10px]">{r.due_date_formula}</code>}
                    <span className="text-zinc-400">·</span>
                    <span>reminders: {r.reminder_days?.join('/') ?? '—'} d</span>
                    {Object.keys(r.applies_when ?? {}).length > 0 && (
                      <>
                        <span className="text-zinc-400">·</span>
                        <span>applies when:</span>
                        {Object.entries(r.applies_when as Record<string, any>).map(([k, v]) => (
                          <code key={k} className="bg-zinc-50 rounded px-1 text-[10px]">{k}={String(v)}</code>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <RuleRowToggle id={r.id} isActive={r.is_active} />
              </div>
            ))}
          </div>
        </section>
      )))}
    </div>
  );
}

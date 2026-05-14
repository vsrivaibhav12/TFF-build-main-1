'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, AlertCircle, Lightbulb } from 'lucide-react';
import ScoreDial from './score-dial';
import { fmtMoney, fmtPct, fmtNum } from './fmt';

export default function SummaryTab({ summary, score, insights, opportunities, wcc, breakEven, debtFreedom }: any) {
  if (!summary) return null;
  const rf = insights?.redFlags ?? summary.categorizedInsights?.redFlags ?? [];
  const wa = insights?.watchAreas ?? summary.categorizedInsights?.watchAreas ?? [];
  const st = insights?.strengths ?? summary.categorizedInsights?.strengths ?? [];
  const opps = opportunities ?? summary.opportunities ?? [];
  const pa = insights?.priorityActions ?? summary.priorityActions ?? [];
  const ns = insights?.nextSteps ?? summary.nextSteps ?? [];

  return (
    <div className="space-y-8">
      {/* Key Metrics + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border border-zinc-200 rounded-xl overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="tff-section-title">Financial Snapshot</CardTitle>
                <CardDescription className="text-base mt-1">Critical metrics at a glance</CardDescription>
              </div>
              <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${summary.overallHealth === 'good' ? 'bg-emerald-100 text-emerald-700' : summary.overallHealth === 'bad' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                {summary.healthLabel}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {summary.keyMetrics?.map((m: any, i: number) => (
                <div key={i} className="p-5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{m.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="tff-section-title">{m.value}</p>
                    {m.status === 'good' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                    {m.status === 'bad' && <TrendingDown className="h-4 w-4 text-rose-500" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Operating Highlights */}
            {summary.operatingHighlights?.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Operating Highlights</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {summary.operatingHighlights.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-zinc-50/50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">{m.label}</span>
                      <span className={`text-sm font-semibold ${m.status === 'good' ? 'text-emerald-600' : m.status === 'bad' ? 'text-rose-600' : 'text-zinc-900'}`}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SWOT */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-rose-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Red Flags ({rf.length})</h4>
                {rf.length === 0 ? <p className="text-xs text-zinc-400 italic">No critical threats</p> : rf.map((f: any, i: number) => (
                  <div key={i} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs text-rose-800 font-medium">
                    <span className="font-bold">{f.title}</span> ({f.metric}): {f.body}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Strengths ({st.length})</h4>
                {st.length === 0 ? <p className="text-xs text-zinc-400 italic">None identified</p> : st.map((s: any, i: number) => (
                  <div key={i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-medium">
                    <span className="font-bold">{s.title}</span> ({s.metric}): {s.body}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-amber-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Watch Areas ({wa.length})</h4>
                {wa.length === 0 ? <p className="text-xs text-zinc-400 italic">None</p> : wa.map((w: any, i: number) => (
                  <div key={i} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-800 font-medium">
                    <span className="font-bold">{w.title}</span> ({w.metric}): {w.body}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-blue-600 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Opportunities ({opps.length})</h4>
                {opps.length === 0 ? <p className="text-xs text-zinc-400 italic">None identified</p> : opps.map((o: any, i: number) => (
                  <div key={i} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-800 font-medium">{o.text}</div>
                ))}
              </div>
            </div>

            {/* Priority Actions + Next Steps */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Priority Actions</h4>
                <div className="space-y-2">
                  {pa.length === 0 ? <p className="text-xs text-zinc-400 italic">No urgent actions</p> : pa.map((a: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-medium ${a.urgency === 'urgent' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                      <span className={`w-2 h-2 mt-1 rounded-full flex-shrink-0 ${a.urgency === 'urgent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      {a.text}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Next Steps</h4>
                <div className="space-y-2">
                  {ns.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-700 font-medium">
                      <span className="text-xs font-semibold text-zinc-400 flex-shrink-0">{i + 1}.</span> {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Health Snapshot */}
            {summary.healthSnapshot?.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Health Snapshot</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {summary.healthSnapshot.map((h: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{h.indicator}</div>
                      <div className="text-sm font-semibold text-zinc-900">{h.value}</div>
                      <div className="text-[10px] text-zinc-500">{h.details}</div>
                      <Badge className={`text-[9px] px-2 py-0 rounded-full ${h.status === 'good' ? 'bg-emerald-100 text-emerald-700' : h.status === 'bad' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{h.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Card */}
        <Card className="border border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center bg-white">
          <ScoreDial score={score} />
          <div className="w-full mt-8 space-y-4">
            {[
              { label: 'Liquidity', val: score?.scores?.liquidity, max: 250 },
              { label: 'Discipline', val: score?.scores?.discipline, max: 200 },
              { label: 'Structure', val: score?.scores?.structure, max: 200 },
              { label: 'Concentration', val: score?.scores?.concentration, max: 150 },
              { label: 'Networth', val: score?.scores?.networth, max: 200 },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-zinc-500">{s.label}</span>
                  <span className="font-semibold text-zinc-900">{s.val ?? 0}/{s.max}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: ((s.val ?? 0) / s.max * 100) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

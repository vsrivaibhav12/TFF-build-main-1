'use client';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function InsightsTab({ insights }: any) {
  if (!insights) return null;
  const { redFlags = [], watchAreas = [], strengths = [], priorityActions = [], nextSteps = [] } = insights;

  const renderCards = (items: any[], level: string) => {
    if (items.length === 0) return <p className="text-xs text-zinc-400 italic pl-4">None identified</p>;
    const styles: Record<string, string> = {
      red: 'bg-rose-50/70 border-rose-100 text-rose-800',
      amber: 'bg-amber-50/70 border-amber-100 text-amber-800',
      green: 'bg-emerald-50/70 border-emerald-100 text-emerald-800',
    };
    const icons: Record<string, React.ReactNode> = {
      red: <AlertTriangle className="h-4 w-4 text-rose-500" />,
      amber: <AlertCircle className="h-4 w-4 text-amber-500" />,
      green: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    };
    return items.map((item: any, i: number) => (
      <Card key={i} className={`border rounded-2xl p-5 ${styles[level]} shadow-sm`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            {icons[level]}
            <h4 className="text-sm font-semibold">{item.title}</h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60">{item.metric}</span>
        </div>
        <p className="text-xs font-medium leading-relaxed">{item.body}</p>
        <div className="mt-2 text-[9px] font-bold uppercase tracking-wider opacity-60">{item.category}</div>
      </Card>
    ));
  };

  return (
    <div className="space-y-8">
      {/* Red Flags */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-rose-600 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Red Flags ({redFlags.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderCards(redFlags, 'red')}</div>
      </div>

      {/* Watch Areas */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-amber-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Watch Areas ({watchAreas.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderCards(watchAreas, 'amber')}</div>
      </div>

      {/* Strengths */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Strengths ({strengths.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderCards(strengths, 'green')}</div>
      </div>

      {/* Priority Actions */}
      {priorityActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-zinc-900">Priority Actions</h3>
          <div className="space-y-2">
            {priorityActions.map((a: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border text-xs font-medium ${a.urgency === 'urgent' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <span className={`w-2.5 h-2.5 mt-0.5 rounded-full flex-shrink-0 ${a.urgency === 'urgent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                {a.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-zinc-900">Recommended Next Steps</h3>
          <div className="space-y-2">
            {nextSteps.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-700 font-medium">
                <span className="text-sm font-semibold text-teal-600 flex-shrink-0">{i + 1}.</span> {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

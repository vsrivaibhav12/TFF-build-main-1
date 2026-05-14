import { computeInsightsForClient } from '@/lib/services/insight-service';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

/**
 * Inline "What we noticed" insight strip. Renders nothing if no insights.
 * Server component — pure read; can be embedded on any client / portal page.
 */
export default async function InsightStrip({ clientId, limit = 3 }: { clientId: string; limit?: number }) {
  const insights = await computeInsightsForClient(clientId);
  if (insights.length === 0) return null;
  const top = insights.slice(0, limit);
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-2" data-testid="insight-strip">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-teal-700" />
        <h4 className="text-sm font-semibold text-teal-900">What we noticed</h4>
      </div>
      {top.map((i) => (
        <div key={i.rule} className="flex items-start gap-3 text-sm">
          <Badge variant={i.severity === 'critical' ? 'danger' : i.severity === 'warning' ? 'warning' : 'outline'}>{i.severity}</Badge>
          <div>
            <div className="font-medium text-zinc-900">{i.headline}</div>
            <div className="text-zinc-600 mt-0.5">{i.narrative}</div>
            {i.recommended_action && <div className="text-xs text-teal-800 mt-1"><strong>Suggested:</strong> {i.recommended_action}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

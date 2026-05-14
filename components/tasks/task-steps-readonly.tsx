import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateIST } from '@/lib/utils';

interface ReadOnlyStep {
  id: string;
  step_order: number;
  title: string;
  description?: string | null;
  is_required: boolean;
  completed_at: string | null;
}

/**
 * Read-only checklist used on the client portal task detail page.
 * Clients see what staff will work through but cannot tick anything off.
 */
export default function TaskStepsReadOnly({ steps }: { steps: ReadOnlyStep[] }) {
  if (!steps || steps.length === 0) return null;
  const completed = steps.filter((s) => s.completed_at).length;
  const pct = Math.round((completed / steps.length) * 100);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4" data-testid="task-steps-readonly">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-teal-600" /> Progress
        </h3>
        <Badge variant={pct === 100 ? 'success' : 'outline'}>
          {completed} / {steps.length} · {pct}%
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {steps.map((s) => {
          const done = !!s.completed_at;
          return (
            <li
              key={s.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-zinc-200 p-3',
                done && 'bg-teal-50/30 border-teal-200',
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-300 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-medium', done && 'text-zinc-500')}>
                  {s.title}
                </div>
                {s.description && (
                  <div className="text-xs text-zinc-500 mt-0.5">{s.description}</div>
                )}
                {done && (
                  <div className="text-[10px] text-zinc-400 mt-1">
                    completed {formatDateIST(s.completed_at!)}
                  </div>
                )}
              </div>
              {!s.is_required && (
                <Badge variant="outline" className="text-[9px]">
                  optional
                </Badge>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

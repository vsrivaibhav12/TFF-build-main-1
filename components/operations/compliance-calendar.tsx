'use client';

import { formatDateIST } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface CalendarEvent {
  date: string;
  type: string;
  label: string;
  clientName: string;
  severity: 'info' | 'warning' | 'danger';
}

interface Props {
  events: CalendarEvent[];
}

const severityConfig = {
  info: { icon: Info, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  danger: { icon: AlertCircle, className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function ComplianceCalendar({ events }: Props) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  // Group by month
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of sorted) {
    const monthKey = e.date.slice(0, 7); // YYYY-MM
    if (!groups.has(monthKey)) groups.set(monthKey, []);
    groups.get(monthKey)!.push(e);
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-zinc-300" />
        <p className="mt-3 text-sm text-zinc-500">No upcoming deadlines in the next 120 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([monthKey, monthEvents]) => {
        const [year, month] = monthKey.split('-');
        const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        return (
          <div key={monthKey}>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3 sticky top-0 bg-white/90 backdrop-blur py-1">{monthLabel}</h3>
            <div className="space-y-2">
              {monthEvents.map((e, idx) => {
                const config = severityConfig[e.severity];
                const Icon = config.icon;
                return (
                  <div key={idx} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${config.className}`}>
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{e.label}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{e.type}</Badge>
                      </div>
                      <div className="text-xs mt-0.5 opacity-80">
                        {e.clientName} · due {formatDateIST(e.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

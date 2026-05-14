'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDateIST, cn } from '@/lib/utils';
import { Building2, Calendar, Clock, FileText, Gavel, Key, AlertTriangle } from 'lucide-react';

type TimelineItem = {
  id: string;
  type: 'filing' | 'task' | 'hearing' | 'dsc';
  date: string;
  client_name: string;
  client_id?: string;
  title: string;
  status: string;
  meta?: string;
  link?: string;
};

interface Props {
  items: TimelineItem[];
}

export default function UpcomingTimeline({ items }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [horizon, setHorizon] = useState<number>(30);

  const todayIso = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const horizonDate = new Date(Date.now() + horizon * 86400000).toISOString().slice(0, 10);
    let data = items.filter((i) => i.date >= todayIso && i.date <= horizonDate);
    if (filter !== 'all') data = data.filter((i) => i.type === filter);
    return data.sort((a, b) => a.date.localeCompare(b.date));
  }, [items, filter, horizon, todayIso]);

  const typeConfig: Record<string, { icon: React.ReactNode; label: string; badge: string }> = {
    filing: { icon: <FileText className="h-4 w-4" />, label: 'Filing', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    task: { icon: <Calendar className="h-4 w-4" />, label: 'Task', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
    hearing: { icon: <Gavel className="h-4 w-4" />, label: 'Hearing', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    dsc: { icon: <Key className="h-4 w-4" />, label: 'DSC', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: filtered.length };
    for (const i of filtered) c[i.type] = (c[i.type] || 0) + 1;
    return c;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {(['all', 'filing', 'task', 'hearing', 'dsc'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                filter === t ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {t === 'all' ? 'All' : typeConfig[t]?.label} {counts[t] ? `(${counts[t]})` : ''}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500">Next</span>
          <select
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value))}
            className="h-8 px-2 rounded-md border border-zinc-200 bg-white text-sm"
          >
            <option value={7}>7 days</option>
            <option value={15}>15 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="tff-card p-8 text-center">
          <p className="text-zinc-500 text-sm">Nothing approaching in the next {horizon} days.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const tc = typeConfig[item.type];
            const daysLeft = Math.ceil((new Date(item.date).getTime() - new Date(todayIso).getTime()) / 86400000);
            const overdue = daysLeft < 0;
            const urgent = daysLeft >= 0 && daysLeft <= 3;

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border bg-white transition-colors',
                  overdue ? 'border-red-200 bg-red-50/30' : urgent ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200'
                )}
              >
                <div className={cn('p-2 rounded-lg border shrink-0', tc.badge)}>
                  {tc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900">{item.title}</span>
                    {overdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> {Math.abs(daysLeft)}d overdue
                      </Badge>
                    )}
                    {urgent && !overdue && (
                      <Badge variant="warning" className="text-[10px]">
                        {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                      </Badge>
                    )}
                    {!urgent && !overdue && (
                      <span className="text-xs text-zinc-400">{daysLeft}d left</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {item.client_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateIST(item.date)}
                    </span>
                    {item.meta && <span>{item.meta}</span>}
                  </div>
                </div>
                {item.link && (
                  <Link
                    href={item.link}
                    className="text-xs font-medium text-teal-700 hover:text-teal-900 shrink-0 mt-1"
                  >
                    Open
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Building2,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const KIND_LABEL: Record<string, string> = {
  gst: 'GST', tds: 'TDS', tcs: 'TCS', it: 'Income Tax', roc: 'ROC',
  pf: 'PF', esi: 'ESI', pt: 'PT', other: 'Other',
};

const KIND_COLORS: Record<string, string> = {
  gst: 'bg-teal-50 text-teal-700 border-teal-100',
  tds: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  it: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  roc: 'bg-amber-50 text-amber-700 border-amber-100',
  pf: 'bg-blue-50 text-blue-700 border-blue-100',
};

interface CalendarEvent {
  id: string;
  client_id: string;
  rule_code: string;
  period_label: string;
  due_date: string;
  status: string;
  task_id: string | null;
  clients: { business_name: string } | null;
  compliance_calendar_rules: { display_name: string; service_kind: string } | null;
}

interface Props {
  rows: CalendarEvent[];
  role: 'admin' | 'team';
}

export default function ComplianceCalendarView({ rows, role }: Props) {
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const r of rows) {
    const key = r.due_date.slice(0, 7); // yyyy-mm
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(r);
  }

  const basePath = `/${role}`;

  return (
    <div className="space-y-12 pb-20">
      {Object.entries(grouped).map(([monthKey, items]) => {
        const [y, m] = monthKey.split('-');
        const monthLabel = new Date(`${y}-${m}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        
        return (
          <div key={monthKey} className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{monthLabel}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent" />
              <Badge variant="outline" className="bg-zinc-50 text-zinc-500 font-bold">
                {items.length} Events
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((it) => (
                <CalendarEventCard key={it.id} event={it} basePath={basePath} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarEventCard({ event, basePath }: { event: CalendarEvent; basePath: string }) {
  const day = event.due_date.slice(8, 10);
  const weekday = new Date(event.due_date).toLocaleDateString('en-IN', { weekday: 'short' });
  const isToday = event.due_date === new Date().toISOString().slice(0, 10);
  const isPast = event.due_date < new Date().toISOString().slice(0, 10);
  
  const kind = event.compliance_calendar_rules?.service_kind || 'other';

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-6 transition-all hover:shadow-2xl hover:border-zinc-300 hover:-translate-y-1",
      isToday && "ring-2 ring-teal-500 ring-offset-2"
    )}>
      <div className="relative z-10 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-14 rounded-2xl flex flex-col items-center justify-center border transition-all group-hover:scale-110 shadow-sm",
              isToday ? "bg-teal-600 border-teal-500 text-white" : 
              isPast ? "bg-zinc-50 border-zinc-100 text-zinc-400" :
              "bg-white border-zinc-200 text-zinc-900"
            )}>
              <span className="text-xl font-semibold tabular-nums leading-none">{day}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-1">{weekday}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                  KIND_COLORS[kind] || "bg-zinc-50 text-zinc-500 border-zinc-100"
                )}>
                  {KIND_LABEL[kind] ?? '—'}
                </span>
                {isToday && <Badge className="bg-teal-500 hover:bg-teal-500 h-4 text-[9px] uppercase font-bold">Today</Badge>}
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mt-1 leading-tight line-clamp-1 group-hover:text-teal-600 transition-colors">
                {event.compliance_calendar_rules?.display_name ?? event.rule_code}
              </h3>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Building2 className="h-3.5 w-3.5 opacity-40" />
            <span className="font-semibold truncate">{event.clients?.business_name ?? 'Individual Client'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5 opacity-40" />
            <span className="font-semibold">{event.period_label}</span>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-zinc-50">
          <div className="flex items-center gap-2">
            {event.task_id ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                <Briefcase className="h-3 w-3" />
                Task Active
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                <Clock className="h-3 w-3" />
                {event.status}
              </div>
            )}
          </div>

          {event.task_id ? (
            <Link href={`${basePath}/tasks/${event.task_id}`}>
              <button className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white text-[10px] font-bold hover:bg-zinc-800 transition-all flex items-center gap-1 shadow-md">
                Open Task
                <ChevronRight className="h-3 w-3" />
              </button>
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </div>
          )}
        </div>
      </div>

      {/* Aesthetic Accents */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-zinc-50 rounded-full blur-3xl opacity-50 group-hover:bg-teal-50 transition-all" />
      <div className="absolute top-0 right-0 p-2 opacity-5">
        <FileText className="h-20 w-20" />
      </div>
    </div>
  );
}

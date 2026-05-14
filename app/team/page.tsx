import { requireRole } from '@/lib/auth/require-role';
import { listTasks, countTasksByStatus } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listAllUpcomingDueDates } from '@/lib/repositories/compliance';
import { listAllNotices, listHearings } from '@/lib/repositories/notices';
import { listExpiringDsc } from '@/lib/repositories/dsc';
import ComplianceCalendar from '@/components/operations/compliance-calendar';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { ArrowRight, Briefcase, Clock, Users, CheckCircle2, AlertCircle, Calendar, FileText, Bell } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function TeamWorkspace() {
  await requireRole(['team', 'admin']);
  const [counts, dueSoon, clients, agg, notices, hearings, dsc] = await Promise.all([
    countTasksByStatus(),
    listTasks({ status: ['pending', 'in_progress'], limit: 5 }),
    listAccessibleClients(),
    listAllUpcomingDueDates(60),
    listAllNotices(),
    listHearings(),
    listExpiringDsc(60),
  ]);

  // Build calendar events
  const events: Array<{
    date: string;
    type: string;
    label: string;
    clientName: string;
    severity: 'info' | 'warning' | 'danger';
  }> = [];
  for (const f of agg.gst as any[])
    events.push({ date: f.due_date, type: 'GST', label: `${f.return_type} ${f.period_month}/${f.period_year}`, clientName: f.clients?.business_name ?? '', severity: f.status === 'filed' ? 'info' : 'warning' });
  for (const f of agg.tds as any[])
    events.push({ date: f.due_date, type: 'TDS', label: `Q${f.period_quarter} ${f.period_year}`, clientName: f.clients?.business_name ?? '', severity: f.status === 'filed' ? 'info' : 'warning' });
  for (const f of agg.it as any[])
    events.push({ date: f.due_date, type: 'IT', label: `FY ${f.fy_ending_year}`, clientName: f.clients?.business_name ?? '', severity: f.status === 'filed' ? 'info' : 'warning' });
  for (const n of notices as any[])
    if (n.due_date) events.push({ date: n.due_date, type: 'Notice', label: n.subject ?? n.notice_number ?? n.notice_type, clientName: n.clients?.business_name ?? '', severity: n.status === 'closed' ? 'info' : 'warning' });
  for (const h of hearings as any[])
    if (h.hearing_scheduled_date) events.push({ date: h.hearing_scheduled_date, type: 'Hearing', label: h.subject ?? h.hearing_type ?? 'Hearing', clientName: h.clients?.business_name ?? '', severity: 'warning' });
  for (const d of dsc as any[])
    events.push({ date: d.expiry_date, type: 'DSC', label: `${d.holder_name} expires`, clientName: d.clients?.business_name ?? '', severity: 'danger' });

  // Count urgent items for this week
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const urgentThisWeek = events.filter(e => new Date(e.date) <= weekFromNow && new Date(e.date) >= today);

  return (
    <StaggerContainer className="space-y-8">
      {/* Header */}
      <StaggerItem>
        <div>
          <h1 className="tff-page-title">My workspace</h1>
          <p className="tff-page-subtitle">Your tasks, deadlines, and client work — all in one place.</p>
        </div>
      </StaggerItem>

      {/* Status bar */}
      <StaggerItem>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: counts.pending ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'In progress', value: counts.in_progress ?? 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Completed', value: counts.completed ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Due this week', value: urgentThisWeek.length, icon: Calendar, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm p-5 transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${m.bg} ${m.color} flex items-center justify-center border ${m.border}`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{m.label}</div>
                  <div className="text-3xl font-bold tabular-nums mt-0.5">{m.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </StaggerItem>

      {/* Two column: Calendar + Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <StaggerItem className="xl:col-span-2">
          <ComplianceCalendar events={events} />
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="tff-section-title">My tasks</h2>
                <p className="text-base text-zinc-500 mt-1">Needs your attention</p>
              </div>
              <Link href="/team/tasks" className="text-[15px] text-teal-700 hover:underline font-medium">View all</Link>
            </div>

            {dueSoon.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-base font-medium text-zinc-700">All caught up</p>
                <p className="text-sm text-zinc-500 mt-1">No pending tasks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueSoon.map((t: any) => (
                  <Link
                    key={t.id}
                    href={`/team/tasks/${t.id}`}
                    className="group flex items-start gap-4 rounded-xl border border-zinc-100 p-4 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold truncate group-hover:text-teal-700 transition-colors">{t.title}</div>
                      <div className="text-sm text-zinc-500 mt-0.5">{t.clients?.business_name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{t.status}</Badge>
                        <span className="text-xs text-zinc-400">Due {formatDateIST(t.due_date)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </StaggerItem>
      </div>

      {/* Clients */}
      {clients.length > 0 && (
        <StaggerItem>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="tff-section-title">My clients</h2>
                <p className="text-base text-zinc-500 mt-1">Quick access to your assigned clients</p>
              </div>
              <Link href="/team/clients" className="text-[15px] text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                All clients <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.slice(0, 6).map((c: any) => (
                <Link
                  key={c.id}
                  href={`/team/clients/${c.id}`}
                  className="group rounded-2xl border border-zinc-200/80 bg-white shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-teal-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center">
                      <Users className="h-5 w-5 text-teal-600" />
                    </div>
                    <Badge variant="outline" className="text-xs">{c.lifecycle_stage}</Badge>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold truncate group-hover:text-teal-700 transition-colors">{c.business_name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{c.pan ?? '—'}</p>
                </Link>
              ))}
            </div>
          </div>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}

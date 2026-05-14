import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { formatDateIST, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Users,
  AlertTriangle,
  ShieldCheck,
  Plus,
  FileText,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ComplianceDonut } from '@/components/ui/compliance-donut';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';

export const dynamic = 'force-dynamic';

const CHART_COLORS = {
  filed: '#10B981',
  pending: '#F59E0B',
  overdue: '#EF4444',
};

export default async function AdminDashboard() {
  const sb = createClient();

  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  // Core firm metrics
  const [
    { count: activeClients },
    { count: openTasks },
    { count: overdueTasks },
    { count: dscExpiring },
    { data: recentTasks },
    { data: upcomingDeadlines },
  ] = await Promise.all([
    sb.from('clients').select('id', { head: true, count: 'exact' }).eq('is_deleted', false),
    sb.from('tasks').select('id', { head: true, count: 'exact' }).eq('is_deleted', false).in('status', ['pending', 'in_progress']),
    sb.from('compliance_status').select('id', { head: true, count: 'exact' }).eq('is_overdue', true),
    sb.from('dsc_records').select('id', { head: true, count: 'exact' }).eq('is_deleted', false).eq('status', 'active').lte('expiry_date', new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)),
    sb.from('tasks').select('id, title, status, due_date, clients(business_name), assigned_to, users_profile!tasks_assigned_to_fkey(full_name)').eq('is_deleted', false).in('status', ['pending', 'in_progress']).order('due_date').limit(5),
    sb.from('compliance_calendar_events').select('id, client_id, rule_code, period_label, due_date, status, clients(business_name), compliance_calendar_rules(display_name, service_kind)').gte('due_date', todayIso).lte('due_date', weekAhead).order('due_date', { ascending: true }).limit(6),
  ]);

  // Compliance data
  const { data: complianceData } = await sb
    .from('compliance_status')
    .select('status')
    .limit(500);

  const filedCount = complianceData?.filter((r: any) => r.status === 'filed').length ?? 0;
  const pendingCount = complianceData?.filter((r: any) => r.status === 'pending').length ?? 0;
  const overdueCount = complianceData?.filter((r: any) => r.status === 'overdue').length ?? 0;

  const donutData = [
    { name: 'Filed', value: filedCount, color: CHART_COLORS.filed },
    { name: 'Pending', value: pendingCount, color: CHART_COLORS.pending },
    { name: 'Overdue', value: overdueCount, color: CHART_COLORS.overdue },
  ].filter((d) => d.value > 0);

  const totalCompliance = filedCount + pendingCount + overdueCount;
  const complianceRate = totalCompliance > 0 ? Math.round((filedCount / totalCompliance) * 100) : 0;

  // Urgent alerts
  const { data: urgentNotices } = await sb
    .from('notices')
    .select('id, subject, notice_type, status, due_date, clients(business_name)')
    .eq('status', 'open')
    .order('due_date')
    .limit(3);

  return (
    <StaggerContainer className="space-y-8">
      {/* Header */}
      <StaggerItem>
        <div>
          <h1 className="tff-page-title">Firm overview</h1>
          <p className="tff-page-subtitle">
            Everything you need to run the firm — at a glance.
          </p>
        </div>
      </StaggerItem>

      {/* KPI Row */}
      <StaggerItem>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active clients" value={activeClients ?? 0} icon={<Users className="h-5 w-5" />} variant="teal" href="/admin/clients" />
          <MetricCard label="Open tasks" value={openTasks ?? 0} icon={<Briefcase className="h-5 w-5" />} variant="default" href="/admin/tasks" trend={{ value: 12, positive: false }} />
          <MetricCard label="Overdue filings" value={overdueTasks ?? 0} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" href="/admin/compliance" />
          <MetricCard label="DSC expiring" value={dscExpiring ?? 0} icon={<ShieldCheck className="h-5 w-5" />} variant="danger" href="/admin/dsc" />
        </div>
      </StaggerItem>

      {/* Quick Actions */}
      <StaggerItem>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'New task', href: '/admin/tasks/bulk-create', icon: Plus },
            { label: 'New client', href: '/admin/clients/new', icon: Users },
            { label: 'Send notice', href: '/admin/notices', icon: Bell },
            { label: 'Run payroll', href: '/admin/payroll', icon: FileText },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-zinc-200/80 text-[15px] font-medium text-zinc-700 hover:border-teal-300 hover:text-teal-700 hover:shadow-sm transition-all"
            >
              <a.icon className="h-4 w-4" />
              {a.label}
            </Link>
          ))}
        </div>
      </StaggerItem>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column — Compliance + Tasks */}
        <div className="xl:col-span-2 space-y-6">
          {/* Compliance Health */}
          <StaggerItem>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="tff-section-title">Compliance health</h2>
                  <p className="text-base text-zinc-500 mt-1">Filing status across all clients</p>
                </div>
                <Link href="/admin/compliance" className="text-[15px] text-teal-700 hover:underline inline-flex items-center gap-1 font-medium">
                  Details <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {totalCompliance === 0 ? (
                <div className="tff-empty p-12">
                  <CheckCircle2 className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                  <p className="text-base text-zinc-500">No compliance data yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex flex-col items-center">
                    <div className="h-52 w-52">
                      <ComplianceDonut data={donutData} />
                    </div>
                    <div className="flex items-center gap-5 mt-3">
                      {donutData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-zinc-600 font-medium">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <ProgressRing progress={complianceRate} size={140} strokeWidth={10} color="#0D9488" label="Compliance rate" sublabel={`${totalCompliance} total filings`} />
                  </div>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* Tasks needing attention */}
          <StaggerItem>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="tff-section-title">Tasks needing attention</h2>
                  <p className="text-base text-zinc-500 mt-1">Open tasks across the firm</p>
                </div>
                <Link href="/admin/tasks" className="text-[15px] text-teal-700 hover:underline inline-flex items-center gap-1 font-medium">
                  All tasks <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {(recentTasks ?? []).length === 0 ? (
                <div className="tff-empty p-12">
                  <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                  <p className="text-base font-medium text-zinc-700">All caught up</p>
                  <p className="text-sm text-zinc-500 mt-1">No open tasks right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(recentTasks ?? []).map((t: any) => (
                    <Link
                      key={t.id}
                      href={`/admin/tasks/${t.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-zinc-100 p-4 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
                    >
                      <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold truncate group-hover:text-teal-700 transition-colors">{t.title}</div>
                        <div className="text-sm text-zinc-500">{t.clients?.business_name} · {(t.users_profile as any)?.full_name ? `${(t.users_profile as any).full_name} · ` : ''}due {t.due_date ? timeAgo(t.due_date).replace(' ago', '') : '—'}</div>
                      </div>
                      <Badge variant="outline" className="text-sm shrink-0">{t.status.replace('_', ' ')}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </StaggerItem>
        </div>

        {/* Right column — Alerts + Pulse */}
        <div className="space-y-6">
          {/* Urgent Alerts */}
          <StaggerItem>
            <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm p-6 md:p-8">
              <h2 className="tff-section-title mb-5">Urgent alerts</h2>
              <div className="space-y-4">
                {(overdueTasks ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50/60 border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[15px] font-semibold text-red-800">{overdueTasks} overdue filing{overdueTasks !== 1 ? 's' : ''}</div>
                      <p className="text-sm text-red-600 mt-0.5">Requires immediate action</p>
                    </div>
                  </div>
                )}
                {(dscExpiring ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                    <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[15px] font-semibold text-amber-800">{dscExpiring} DSC expiring soon</div>
                      <p className="text-sm text-amber-600 mt-0.5">Within 30 days</p>
                    </div>
                  </div>
                )}
                {(urgentNotices ?? []).length > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                    <Bell className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[15px] font-semibold text-blue-800">{urgentNotices?.length} open notice{(urgentNotices?.length ?? 0) !== 1 ? 's' : ''}</div>
                      <p className="text-sm text-blue-600 mt-0.5">Awaiting response</p>
                    </div>
                  </div>
                )}
                {(overdueTasks ?? 0) === 0 && (dscExpiring ?? 0) === 0 && (urgentNotices ?? []).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-base font-medium text-zinc-700">All clear</p>
                    <p className="text-sm text-zinc-500 mt-1">Nothing urgent right now.</p>
                  </div>
                )}
              </div>
            </div>
          </StaggerItem>

          {/* Upcoming Deadlines */}
          <StaggerItem>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="tff-section-title">Upcoming deadlines</h2>
                <Link href="/admin/compliance" className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1 font-medium">
                  Calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {(upcomingDeadlines ?? []).length === 0 ? (
                <div className="tff-empty p-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No deadlines in the next 7 days.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(upcomingDeadlines ?? []).map((d: any) => (
                    <Link
                      key={d.id}
                      href={`/admin/compliance`}
                      className="group flex items-center gap-3 rounded-xl border border-zinc-100 p-3 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
                    >
                      <div className="h-9 w-9 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-200">
                        <span className="text-xs font-bold text-zinc-600">{new Date(d.due_date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate group-hover:text-teal-700 transition-colors">{d.compliance_calendar_rules?.display_name ?? d.rule_code}</div>
                        <div className="text-xs text-zinc-500">{d.clients?.business_name} · {d.period_label}</div>
                      </div>
                      <Badge variant={d.status === 'filed' ? 'success' : d.status === 'overdue' ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                        {d.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </StaggerItem>

          {/* Filing Breakdown */}
          <StaggerItem>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
              <h2 className="tff-section-title mb-5">Filing breakdown</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[15px] font-medium text-zinc-700">Filed</span>
                    <span className="text-[15px] font-bold text-emerald-600">{filedCount}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${totalCompliance > 0 ? (filedCount / totalCompliance) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[15px] font-medium text-zinc-700">Pending</span>
                    <span className="text-[15px] font-bold text-amber-600">{pendingCount}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${totalCompliance > 0 ? (pendingCount / totalCompliance) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[15px] font-medium text-zinc-700">Overdue</span>
                    <span className="text-[15px] font-bold text-red-600">{overdueCount}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${totalCompliance > 0 ? (overdueCount / totalCompliance) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </StaggerItem>
        </div>
      </div>
    </StaggerContainer>
  );
}

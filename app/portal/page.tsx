import { requireRole } from '@/lib/auth/require-role';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import { listQueries } from '@/lib/repositories/queries';
import { listAllNotices } from '@/lib/repositories/notices';
import { computeComplianceScore } from '@/lib/services/compliance-score';
import { Badge } from '@/components/ui/badge';
import { ProgressRing } from '@/components/ui/progress-ring';
import { formatDateIST, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, Briefcase, MessageSquare, FileCheck, Clock, CheckCircle2, FileText, Bell } from 'lucide-react';
import * as bizlensRepo from '@/lib/repositories/bizlens';
import * as bizlensService from '@/lib/services/bizlens-service';
import BizlensSnapshot from '@/components/portal/bizlens-snapshot';
import {
  getClientVisibleStatus,
  CLIENT_VISIBLE_LABELS,
  CLIENT_VISIBLE_VARIANTS,
} from '@/lib/services/client-visible-status';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function ClientPortalDashboard() {
  const me = await requireRole('client');
  const clients = await listAccessibleClients();
  const clientId = clients[0]?.id || '';

  const [tasks, queries, bizlensReports, notices] = await Promise.all([
    listTasks({ limit: 20 }),
    listQueries({ mineOnly: true, userId: me.id }),
    bizlensRepo.listReportsByClient(clientId),
    listAllNotices(),
  ]);

  const latestReportData = bizlensReports.find((r: any) => r.status === 'published');
  let bizlensSnapshotProps = null;

  if (latestReportData) {
    const report = bizlensService.computeReport(latestReportData);
    const score = bizlensService.computeBizLensScore(report);
    bizlensSnapshotProps = { report, score, clientId };
  }

  const tasksWithStatus = tasks.map((t: any) => ({ ...t, _cs: getClientVisibleStatus(t) }));
  const awaitingYou = tasksWithStatus.filter((t: any) => t._cs === 'we_need_info');
  const completedTasks = tasksWithStatus.filter((t: any) => t._cs === 'completed');
  const openQueries = queries.filter((q: any) => q.status !== 'resolved' && q.status !== 'closed');
  const openNotices = (notices as any[]).filter((n: any) => n.status === 'open');

  const complianceBreakdown = clientId ? await computeComplianceScore(clientId) : null;
  const complianceScore = complianceBreakdown?.overall ?? 0;

  return (
    <StaggerContainer className="space-y-8">
      {/* Welcome Hero */}
      <StaggerItem>
        <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 p-8 md:p-10 text-white shadow-teal-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-teal-100 text-base font-medium">
                {getGreeting()}{me.full_name ? `, ${me.full_name.split(' ')[0]}` : ''}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">
                Your compliance hub
              </h1>
              <p className="text-teal-100 text-base mt-3 max-w-lg leading-relaxed">
                Track filings, respond to queries, and view your financial insights — all in one place.
              </p>
            </div>
            <div className="hidden md:flex h-20 w-20 rounded-3xl bg-white/15 backdrop-blur-sm items-center justify-center border border-white/20 shrink-0">
              <FileCheck className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* Status Overview */}
      <StaggerItem>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/portal/calendar" className="rounded-2xl border border-zinc-200 bg-white p-5 flex items-center gap-4 hover:border-teal-300 transition-colors">
            <ProgressRing progress={complianceScore} size={64} strokeWidth={6} color="#0D9488" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Compliance</div>
              <div className="text-lg font-bold text-zinc-900 mt-0.5">{complianceScore}%</div>
              {complianceBreakdown && (
                <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
                  GST {complianceBreakdown.gst.score}% · TDS {complianceBreakdown.tds.score}% · IT {complianceBreakdown.it.score}%
                </div>
              )}
            </div>
          </Link>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Awaiting you</span>
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums">{awaitingYou.length}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Open queries</span>
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums">{openQueries.length}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Bell className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Notices</span>
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums">{openNotices.length}</div>
          </div>
        </div>
      </StaggerItem>

      {/* BizLens Snapshot */}
      {bizlensSnapshotProps && (
        <StaggerItem>
          <BizlensSnapshot {...bizlensSnapshotProps} />
        </StaggerItem>
      )}

      {/* Two column: Action Required + Notices/Queries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Action Required */}
        <StaggerItem>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="tff-section-title">Action required</h2>
                <p className="text-base text-zinc-500 mt-1">Tasks waiting for your input</p>
              </div>
              <Link href="/portal/tasks" className="text-sm text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {awaitingYou.length === 0 ? (
              <div className="tff-empty p-12">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-base font-medium text-zinc-700">Nothing waiting on you</p>
                <p className="text-sm text-zinc-500 mt-1">We will notify you when something needs your attention.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {awaitingYou.map((t: any) => (
                  <Link
                    key={t.id}
                    href={`/portal/tasks/${t.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-zinc-100 p-4 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
                  >
                    <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold truncate group-hover:text-teal-700 transition-colors">{t.title}</div>
                      <div className="text-sm text-zinc-500 mt-0.5">{t.clients?.business_name} · due {t.due_date ? timeAgo(t.due_date).replace(' ago', '') : '—'}</div>
                    </div>
                    <Badge variant="warning" className="shrink-0">Needs action</Badge>
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-teal-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Notices + Queries */}
        <div className="space-y-6">
          {/* Notices */}
          {openNotices.length > 0 && (
            <StaggerItem>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="tff-section-title">Notices</h2>
                    <p className="text-base text-zinc-500 mt-1">From tax authorities</p>
                  </div>
                  <Link href="/portal/notices" className="text-sm text-teal-700 hover:underline font-medium">View all</Link>
                </div>
                <div className="space-y-3">
                  {openNotices.slice(0, 3).map((n: any) => (
                    <Link
                      key={n.id}
                      href={`/portal/notices`}
                      className="group flex items-center gap-4 rounded-xl border border-zinc-100 p-4 hover:border-red-200 hover:bg-red-50/20 transition-all"
                    >
                      <div className="h-11 w-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold truncate group-hover:text-red-700 transition-colors">{n.subject ?? n.notice_type}</div>
                        <div className="text-sm text-zinc-500 mt-0.5">{n.clients?.business_name}</div>
                      </div>
                      <Badge variant="danger" className="shrink-0">Open</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}

          {/* Queries */}
          {openQueries.length > 0 && (
            <StaggerItem>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="tff-section-title">Your queries</h2>
                    <p className="text-base text-zinc-500 mt-1">Questions you have raised</p>
                  </div>
                  <Link href="/portal/queries" className="text-sm text-teal-700 hover:underline font-medium">View all</Link>
                </div>
                <div className="space-y-3">
                  {openQueries.slice(0, 3).map((q: any) => (
                    <Link
                      key={q.id}
                      href={`/portal/queries/${q.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-zinc-100 p-4 hover:border-blue-200 hover:bg-blue-50/20 transition-all"
                    >
                      <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold truncate group-hover:text-blue-700 transition-colors">{q.subject}</div>
                        <div className="text-sm text-zinc-500 mt-0.5">{timeAgo(q.created_at)}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0">{q.status}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}
        </div>
      </div>
    </StaggerContainer>
  );
}

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { loadComplianceDashboard } from '@/lib/repositories/compliance-dashboard';
import ComplianceDashboard from '@/components/operations/compliance-dashboard';
import ComplianceCalendarView from '@/components/operations/compliance-calendar-view';
import UpcomingTimeline from '@/components/operations/upcoming-timeline';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDateIST } from '@/lib/utils';
import { ChevronRight, Building2, Clock, Gavel, ScrollText, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';
import RefreshEventsBtn from '../settings/compliance-rules/refresh-button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminCompliancePage() {
  await requireRole('admin');
  const sb = createClient();

  const todayIso = new Date().toISOString().slice(0, 10);
  const horizonIso = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  // Dashboard data (kept for Health tab)
  const cells = await loadComplianceDashboard({ horizonMonths: 6 });

  // Calendar data
  const { data: calendarRows } = await sb
    .from('compliance_calendar_events')
    .select('id, client_id, rule_code, period_label, due_date, status, task_id, clients(business_name), compliance_calendar_rules(display_name, service_kind)')
    .gte('due_date', todayIso)
    .lte('due_date', horizonIso)
    .order('due_date', { ascending: true })
    .limit(500);

  // Tasks data for timeline
  const { data: taskRows } = await sb
    .from('tasks')
    .select('id, title, due_date, status, priority, client_id, clients!tasks_client_id_fkey(business_name)')
    .eq('is_deleted', false)
    .gte('due_date', todayIso)
    .lte('due_date', horizonIso)
    .order('due_date', { ascending: true })
    .limit(200);

  // Hearings data
  const { data: hearings } = await sb
    .from('hearings')
    .select('id, hearing_type, subject, status, hearing_scheduled_date, clients(business_name)')
    .order('hearing_scheduled_date', { ascending: true })
    .limit(100);

  // DSC expiry data
  const { data: dscRows } = await sb
    .from('dsc')
    .select('id, holder_name, expiry_date, clients!dsc_client_id_fkey(business_name)')
    .gte('expiry_date', todayIso)
    .order('expiry_date', { ascending: true })
    .limit(100);

  // Notices data
  const { data: notices } = await sb
    .from('notices')
    .select('id, notice_type, subject, status, notice_date, due_date, clients(business_name)')
    .order('notice_date', { ascending: false })
    .limit(100);

  // Build timeline items
  const timelineItems = [
    ...(calendarRows ?? []).map((r: any) => ({
      id: r.id,
      type: 'filing' as const,
      date: r.due_date,
      client_name: r.clients?.business_name ?? '—',
      client_id: r.client_id,
      title: `${r.compliance_calendar_rules?.display_name ?? r.rule_code} — ${r.period_label}`,
      status: r.status,
      meta: r.status,
      link: r.task_id ? `/admin/tasks/${r.task_id}` : undefined,
    })),
    ...(taskRows ?? []).map((r: any) => ({
      id: r.id,
      type: 'task' as const,
      date: r.due_date,
      client_name: r.clients?.business_name ?? '—',
      client_id: r.client_id,
      title: r.title,
      status: r.status,
      meta: r.priority,
      link: `/admin/tasks/${r.id}`,
    })),
    ...(hearings ?? []).map((r: any) => ({
      id: r.id,
      type: 'hearing' as const,
      date: r.hearing_scheduled_date,
      client_name: r.clients?.business_name ?? '—',
      title: r.subject || r.hearing_type,
      status: r.status,
      meta: r.status,
      link: `/team/hearings/${r.id}`,
    })),
    ...(dscRows ?? []).map((r: any) => ({
      id: r.id,
      type: 'dsc' as const,
      date: r.expiry_date,
      client_name: r.clients?.business_name ?? '—',
      title: `DSC expiry — ${r.holder_name}`,
      status: 'upcoming',
      meta: 'DSC',
    })),
  ];

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Compliance</h1>
          <p className="tff-page-subtitle">
            Upcoming deadlines, filing health, notices, and hearings across your portfolio.
          </p>
        </div>
        <RefreshEventsBtn />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <UpcomingTimeline items={timelineItems} />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <ComplianceDashboard cells={cells} role="admin" />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <ComplianceCalendarView rows={calendarRows as any || []} role="admin" />
        </TabsContent>

        <TabsContent value="notices" className="mt-6">
          {(!notices || notices.length === 0) ? (
            <EmptyState
              title="No notices yet"
              body="Statutory notices will appear here once recorded by your team."
              icon={<ScrollText className="h-6 w-6 text-zinc-400" />}
            />
          ) : (
            <div className="tff-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead>Notice &amp; client</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.map((n: any) => (
                    <TableRow key={n.id} data-row>
                      <TableCell>
                        <div className="font-medium text-zinc-900">{n.subject || n.notice_type}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{(n.clients as any)?.business_name ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={n.status === 'closed' ? 'success' : 'destructive'}>{n.status}</Badge>
                      </TableCell>
                      <TableCell className="text-zinc-700 tabular-nums">{formatDateIST(n.notice_date)}</TableCell>
                      <TableCell className="tabular-nums text-red-600">
                        {n.due_date ? formatDateIST(n.due_date) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/team/notices/${n.id}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                          aria-label="Open notice"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hearings" className="mt-6">
          {(hearings ?? []).length === 0 ? (
            <EmptyState
              title="No upcoming hearings"
              body="Scheduled hearings will appear here once added to the system."
              icon={<Gavel className="h-6 w-6 text-zinc-400" />}
            />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-zinc-50/50">
                    <TableHead>Hearing &amp; client</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hearings!.map((h: any) => (
                    <TableRow key={h.id} data-row>
                      <TableCell>
                        <div className="font-medium text-zinc-900">{h.subject || h.hearing_type}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{(h.clients as any)?.business_name ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            h.status === 'attended' || h.status === 'concluded' ? 'success' : 'warning'
                          }
                        >
                          {h.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-700 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          {formatDateIST(h.hearing_scheduled_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/team/hearings/${h.id}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                          aria-label="Open hearing"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { ensureModuleVisible } from '@/lib/auth/portal-visibility';
import { listAllUpcomingDueDates } from '@/lib/repositories/compliance';
import ComplianceCalendar from '@/components/operations/compliance-calendar';

export const dynamic = 'force-dynamic';

export default async function PortalCalendarPage() {
  await ensureModuleVisible('portal.compliance_calendar');
  const agg = await listAllUpcomingDueDates(120);
  const events: any[] = [];
  for (const f of agg.gst as any[]) events.push({ date: f.due_date, type: 'GST', label: `${f.return_type} ${f.period_month}/${f.period_year}`, clientName: f.clients?.business_name ?? '', severity: f.status === 'filed' ? 'info' : 'warning' });
  for (const f of agg.tds as any[]) events.push({ date: f.due_date, type: 'TDS', label: `Q${f.period_quarter} ${f.period_year}`, clientName: f.clients?.business_name ?? '', severity: f.status === 'filed' ? 'info' : 'warning' });
  for (const f of agg.it as any[]) events.push({ date: f.due_date, type: 'IT', label: `FY ${f.fy_ending_year}`, clientName: f.clients?.business_name ?? '', severity: f.status === 'filed' ? 'info' : 'warning' });
  return (
    <div className="space-y-8">
      <div><h1 className="tff-page-title">Compliance calendar</h1><p className="tff-page-subtitle">All filings due across your engagements.</p></div>
      <ComplianceCalendar events={events} />
    </div>
  );
}

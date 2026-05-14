import { requireRole } from '@/lib/auth/require-role';
import { listAttendanceForUser, getTodayAttendance } from '@/lib/repositories/attendance';
import { createClient } from '@/lib/supabase/server';
import CheckInOut from './check-in-out';
import ManualAttendanceForm from './manual-entry-form';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { MapPin, ClipboardList } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const me = await requireRole(['admin', 'team']);
  const sb = createClient();
  const now = new Date();
  const [today, monthLogs, profile] = await Promise.all([
    getTodayAttendance(me.id),
    listAttendanceForUser(me.id, now.getFullYear(), now.getMonth() + 1),
    sb.from('users_profile').select('geo_check_in_required').eq('id', me.id).maybeSingle(),
  ]);
  const geoRequired = !!profile.data?.geo_check_in_required;
  const present = monthLogs.filter((l: any) => l.status === 'present' || l.status === 'work_from_home').length;
  const onLeave = monthLogs.filter((l: any) => l.status === 'leave').length;
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="tff-page-title">My attendance</h1>
          <p className="tff-page-subtitle">Today, this month, and historical logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <ManualAttendanceForm />
          <CheckInOut today={today as any} geoRequired={geoRequired} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="Present this month" value={`${present}d`} />
        <Metric label="On leave this month" value={`${onLeave}d`} />
        <Metric label="Today" value={today ? ((today as any).status ?? 'present') : 'not checked in'} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>In</TableHead><TableHead>Out</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
          <TableBody>{monthLogs.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="p-0"><EmptyState title="No attendance logs" body="Check in today to start recording your attendance." icon={<ClipboardList className="h-6 w-6 text-zinc-400" />} /></TableCell></TableRow>
          ) : (monthLogs.map((l: any) => (
            <TableRow key={l.id}>
              <TableCell>{formatDateIST(l.attendance_date)}</TableCell>
              <TableCell><Badge variant={l.status === 'leave' ? 'warning' : 'success'}>{l.status}</Badge></TableCell>
              <TableCell className="text-xs">{l.check_in_time ? new Date(l.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
              <TableCell className="text-xs">{l.check_out_time ? new Date(l.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
              <TableCell className="text-xs text-zinc-500">
                {l.check_in_lat != null && l.check_in_lng != null ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${l.check_in_lat}&mlon=${l.check_in_lng}&zoom=16`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-teal-700"
                    title={l.check_in_accuracy_m ? `±${l.check_in_accuracy_m}m accuracy` : undefined}
                  >
                    <MapPin className="h-3 w-3" /> {Number(l.check_in_lat).toFixed(3)}, {Number(l.check_in_lng).toFixed(3)}
                  </a>
                ) : (
                  '—'
                )}
              </TableCell>
            </TableRow>
          )))}</TableBody>
        </Table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-zinc-200 p-6 bg-white"><div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div><div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div></div>;
}

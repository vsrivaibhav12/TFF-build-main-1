import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { listTeamUsers } from '@/lib/repositories/clients';
import AdminAttendanceRoster from './admin-attendance-roster';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage({ searchParams }: { searchParams?: { date?: string } }) {
  await requireRole('admin');
  const sb = createClient();

  // Default to today
  const dateParam = searchParams?.date;
  const selectedDate = dateParam || new Date().toISOString().slice(0, 10);

  const teamUsers = await listTeamUsers();

  const { data: logs } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, is_manually_created, override_reason, overridden_by')
    .eq('attendance_date', selectedDate);

  const logByUser = new Map<string, any>();
  for (const l of logs ?? []) {
    logByUser.set(l.user_id, l);
  }

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Attendance</h1>
          <p className="tff-page-subtitle">Mark and review attendance for all staff members. Admin override is always possible.</p>
        </div>
      </div>
      <AdminAttendanceRoster
        date={selectedDate}
        teamUsers={teamUsers as any}
        logs={logByUser}
      />
    </div>
  );
}

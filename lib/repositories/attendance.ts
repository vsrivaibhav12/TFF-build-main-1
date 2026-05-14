import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listAttendanceForUser(userId: string, year: number, month: number) {
  const sb = createClient();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  const { data } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, leave_type, is_manually_created, override_reason, check_in_lat, check_in_lng, check_in_accuracy_m, users_profile!attendance_logs_user_id_fkey(full_name)')
    .eq('user_id', userId)
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: true });
  return data ?? [];
}

export async function listAllAttendanceForMonth(year: number, month: number) {
  const sb = createClient();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  const { data } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, users_profile!attendance_logs_user_id_fkey(full_name)')
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: true });
  return data ?? [];
}

export async function getTodayAttendance(userId: string) {
  const sb = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from('attendance_logs')
    .select('id, attendance_date, check_in_time, check_out_time, status')
    .eq('user_id', userId)
    .eq('attendance_date', today)
    .maybeSingle();
  return data;
}

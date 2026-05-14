import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listLeaveRequests(filter?: { userId?: string; status?: string }) {
  const sb = createClient();
  let q = sb
    .from('leave_requests')
    .select('id, user_id, leave_type, from_date, to_date, number_of_days, reason, status, reviewed_by, reviewed_at, review_remarks, created_at, users_profile!leave_requests_user_id_fkey(full_name, email)')
    .order('created_at', { ascending: false });
  if (filter?.userId) q = q.eq('user_id', filter.userId);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}

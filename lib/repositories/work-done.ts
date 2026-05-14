import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listWorkDone(opts: { userId?: string; startDate?: string; endDate?: string } = {}) {
  const sb = createClient();
  let q = sb
    .from('work_done')
    .select('*, tasks!work_done_task_id_fkey(title), clients!work_done_client_id_fkey(business_name)')
    .order('date', { ascending: false });
  
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.startDate) q = q.gte('date', opts.startDate);
  if (opts.endDate) q = q.lte('date', opts.endDate);
  
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function addWorkDoneRecord(payload: {
  user_id: string;
  task_id?: string;
  client_id?: string;
  date: string;
  minutes: number;
  description: string;
  started_at?: string;
  ended_at?: string;
}) {
  const sb = createClient();
  const { data, error } = await sb.from('work_done').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteWorkDoneRecord(id: string, userId: string) {
  const sb = createClient();
  const { error } = await sb.from('work_done').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

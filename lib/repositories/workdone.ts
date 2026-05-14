import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface WorkDoneRow {
  id: string;
  task_id: string;
  user_id: string;
  client_id: string;
  work_date: string;
  duration_minutes: number;
  note: string | null;
  entry_method: 'timer' | 'manual';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  users_profile?: { full_name: string } | null;
  tasks?: { title: string } | null;
  clients?: { business_name: string } | null;
}

export async function listWorkDoneForTask(taskId: string): Promise<WorkDoneRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_workdone')
    .select('*, users_profile!task_workdone_user_id_fkey(full_name)')
    .eq('task_id', taskId)
    .order('work_date', { ascending: false });
  return (data ?? []) as WorkDoneRow[];
}

export async function listWorkDoneForUser(userId: string, fromIso: string, toIso: string): Promise<WorkDoneRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_workdone')
    .select('*, tasks(title), clients(business_name)')
    .eq('user_id', userId)
    .gte('work_date', fromIso)
    .lte('work_date', toIso)
    .order('work_date', { ascending: false });
  return (data ?? []) as WorkDoneRow[];
}

export interface WorkDoneSummaryRow {
  user_id: string;
  user_name: string;
  client_id: string;
  client_name: string;
  total_minutes: number;
}

export async function listWorkDoneSummary(fromIso: string, toIso: string): Promise<WorkDoneSummaryRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_workdone')
    .select('user_id, client_id, duration_minutes, users_profile!task_workdone_user_id_fkey(full_name), clients(business_name)')
    .gte('work_date', fromIso)
    .lte('work_date', toIso);
  const map: Record<string, WorkDoneSummaryRow> = {};
  for (const r of (data ?? []) as any[]) {
    const key = `${r.user_id}::${r.client_id}`;
    if (!map[key]) {
      map[key] = {
        user_id: r.user_id,
        user_name: r.users_profile?.full_name ?? 'Unknown',
        client_id: r.client_id,
        client_name: r.clients?.business_name ?? 'Unknown',
        total_minutes: 0,
      };
    }
    map[key].total_minutes += r.duration_minutes;
  }
  return Object.values(map).sort((a, b) => b.total_minutes - a.total_minutes);
}

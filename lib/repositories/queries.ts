import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listQueries(opts: { clientId?: string; status?: string[]; mineOnly?: boolean; userId?: string } = {}) {
  const sb = createClient();
  let q = sb
    .from('queries')
    .select('id, subject, status, priority, created_at, updated_at, client_id, created_by, assigned_to, clients!queries_client_id_fkey(business_name), creator:users_profile!queries_created_by_fkey(full_name)')
    .order('updated_at', { ascending: false });
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.status?.length) q = q.in('status', opts.status);
  if (opts.mineOnly && opts.userId) q = q.eq('created_by', opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getQueryWithMessages(queryId: string) {
  const sb = createClient();
  const { data: query, error } = await sb
    .from('queries')
    .select('*, clients!queries_client_id_fkey(business_name), creator:users_profile!queries_created_by_fkey(full_name, email), assignee:users_profile!queries_assigned_to_fkey(full_name, email)')
    .eq('id', queryId)
    .maybeSingle();
  if (error) throw error;
  if (!query) return null;
  const { data: messages, error: e2 } = await sb
    .from('query_messages')
    .select('id, message_text, created_at, sender_id, users_profile!query_messages_sender_id_fkey(full_name, email, role)')
    .eq('query_id', queryId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  if (e2) throw e2;
  return { query, messages: messages ?? [] };
}

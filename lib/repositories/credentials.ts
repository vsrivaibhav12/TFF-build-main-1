import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listCredentials(clientId?: string) {
  const sb = createClient();
  let q = sb
    .from('credentials')
    .select('id, client_id, portal_name, portal_url, username, is_active, last_used_date, updated_at, clients(business_name)')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getCredentialById(id: string) {
  const sb = createClient();
  const { data } = await sb
    .from('credentials')
    .select('id, client_id, portal_name, portal_url, username, encrypted_password, security_question, encrypted_security_answer, is_active, clients(business_name)')
    .eq('id', id)
    .maybeSingle();
  return data;
}

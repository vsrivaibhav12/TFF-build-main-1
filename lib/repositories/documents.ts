import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listDocuments(filter?: { clientId?: string; visibleToClient?: boolean }) {
  const sb = createClient();
  let q = sb
    .from('documents')
    .select('id, client_id, file_name, file_url, file_size, document_category, document_period_month, document_period_year, visible_to_client, description, uploaded_by, created_at, clients(business_name), users_profile!documents_uploaded_by_fkey(full_name)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.visibleToClient !== undefined) q = q.eq('visible_to_client', filter.visibleToClient);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}


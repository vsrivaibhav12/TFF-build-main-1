import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';

export interface AuditEntry {
  action: string;                  // e.g. 'capability.grant'
  entity_type: string;              // e.g. 'user' | 'client'
  entity_id?: string | null;
  performed_by: string;
  details?: Record<string, any>;
  /** Use service-role when RLS would otherwise block the writer. */
  serviceRole?: boolean;
}

export async function writeAudit(entry: AuditEntry) {
  const sb = entry.serviceRole ? createServiceClient() : createClient();
  await sb.from('global_audit_log').insert({
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    performed_by: entry.performed_by,
    details: entry.details ?? {},
  });
}

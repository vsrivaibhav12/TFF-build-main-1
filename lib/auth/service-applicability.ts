import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/actions/result';

export type ServiceKind =
  | 'gst'
  | 'tds'
  | 'income_tax'
  | 'compliance'
  | 'bizlens'
  | 'vcfo'
  | 'notice'
  | 'payroll'
  | 'other';

/**
 * Return the set of service_kinds the given client is currently subscribed to
 * (i.e. has at least one ACTIVE row in client_services pointing to a service
 * with that kind). Used to gate data-entry modules in the team client detail.
 */
export async function getClientServiceKinds(clientId: string): Promise<Set<ServiceKind>> {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_services')
    .select('services(service_kind), is_active')
    .eq('client_id', clientId)
    .eq('is_active', true);
  if (error) throw new ServiceError(error.message, error.code);
  const kinds = new Set<ServiceKind>();
  for (const row of data ?? []) {
    const k = (row as any)?.services?.service_kind as ServiceKind | null | undefined;
    if (k) kinds.add(k);
  }
  return kinds;
}

/** Convenience: true if client has at least one active service of this kind. */
export async function clientHasServiceKind(
  clientId: string,
  kind: ServiceKind,
): Promise<boolean> {
  const kinds = await getClientServiceKinds(clientId);
  return kinds.has(kind);
}

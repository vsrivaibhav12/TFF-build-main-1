'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { writeAudit } from '@/lib/services/audit-service';
import { PORTAL_MODULES, type PortalModule } from '@/lib/auth/portal-visibility';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function setPortalVisibilityAction(input: {
  client_id: string;
  module_key: PortalModule;
  is_enabled: boolean;
}): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.toggle_portal');
    if (!PORTAL_MODULES.includes(input.module_key)) {
      return fail(`Unknown module: ${input.module_key}`, 'VALIDATION');
    }
    if (input.module_key === 'portal.dashboard') {
      return fail('portal.dashboard is always visible', 'VALIDATION');
    }
    const sb = createClient();
    const { error } = await sb.from('client_portal_visibility').upsert(
      {
        client_id: input.client_id,
        module_key: input.module_key,
        is_enabled: input.is_enabled,
        updated_at: new Date().toISOString(),
        updated_by: me.id,
      },
      { onConflict: 'client_id,module_key' },
    );
    if (error) return fail(error.message, 'DB');
    await writeAudit({
      action: 'portal_visibility.set',
      entity_type: 'client',
      entity_id: input.client_id,
      performed_by: me.id,
      details: { module_key: input.module_key, is_enabled: input.is_enabled },
    });
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/admin/clients/${input.client_id}/portal`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Seed dashboard + tasks + queries when admin first toggles portal_enabled=true.
 * Idempotent (does nothing if rows already exist).
 */
export async function seedDefaultPortalVisibility(clientId: string, performedBy: string) {
  const sb = createClient();
  const defaults: PortalModule[] = ['portal.dashboard', 'portal.tasks', 'portal.queries'];
  for (const mod of defaults) {
    await sb.from('client_portal_visibility').upsert(
      {
        client_id: clientId,
        module_key: mod,
        is_enabled: true,
        updated_at: new Date().toISOString(),
        updated_by: performedBy,
      },
      { onConflict: 'client_id,module_key' },
    );
  }
}

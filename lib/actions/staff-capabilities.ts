'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ALL_CAPABILITIES, type Capability } from '@/lib/auth/capabilities';
import { requireCapability } from '@/lib/auth/require-capability';
import { writeAudit } from '@/lib/services/audit-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';

/**
 * Replace the granted capability set for a user with the provided list.
 * Diffs current vs target, audits each grant/revoke, notifies the affected user.
 * Caller must be admin (capability layer enforces staff.grant_capabilities).
 */
export async function setUserCapabilitiesAction(input: {
  user_id: string;
  capabilities: Capability[];
}): Promise<ActionResult<{ granted: number; revoked: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.grant_capabilities');

    // Validate capability strings against the closed list
    const valid = new Set<string>(ALL_CAPABILITIES);
    for (const c of input.capabilities) {
      if (!valid.has(c)) return fail(`Unknown capability: ${c}`, 'VALIDATION');
    }

    const sb = createClient();
    const { data: existing } = await sb
      .from('staff_capabilities')
      .select('id, capability, revoked_at')
      .eq('user_id', input.user_id);

    const currentActive = new Set<string>();
    const known: Record<string, { id: string; revoked: boolean }> = {};
    for (const r of existing ?? []) {
      known[(r as any).capability] = { id: (r as any).id, revoked: !!(r as any).revoked_at };
      if (!(r as any).revoked_at) currentActive.add((r as any).capability);
    }

    const target = new Set<string>(input.capabilities);
    const toGrant = [...target].filter((c) => !currentActive.has(c));
    const toRevoke = [...currentActive].filter((c) => !target.has(c));

    // Grants: upsert (re-grant clears revoked_at)
    for (const cap of toGrant) {
      if (known[cap]) {
        await sb
          .from('staff_capabilities')
          .update({ revoked_at: null, revoked_by: null, granted_at: new Date().toISOString(), granted_by: me.id })
          .eq('id', known[cap].id);
      } else {
        await sb.from('staff_capabilities').insert({
          user_id: input.user_id,
          capability: cap,
          granted_by: me.id,
        });
      }
      await writeAudit({
        action: 'capability.grant',
        entity_type: 'user',
        entity_id: input.user_id,
        performed_by: me.id,
        details: { capability: cap },
      });
    }

    // Revokes
    for (const cap of toRevoke) {
      const row = known[cap];
      if (!row) continue;
      await sb
        .from('staff_capabilities')
        .update({ revoked_at: new Date().toISOString(), revoked_by: me.id })
        .eq('id', row.id);
      await writeAudit({
        action: 'capability.revoke',
        entity_type: 'user',
        entity_id: input.user_id,
        performed_by: me.id,
        details: { capability: cap },
      });
    }

    if (toGrant.length || toRevoke.length) {
      await notify({
        user_id: input.user_id,
        type: 'team_alert',
        title: 'Your access was updated',
        message: `Capabilities updated by ${me.full_name ?? me.email}: +${toGrant.length} granted, -${toRevoke.length} revoked.`,
      });
    }

    revalidatePath(`/admin/team/${input.user_id}`);
    revalidatePath(`/admin/team/${input.user_id}/capabilities`);
    return ok({ granted: toGrant.length, revoked: toRevoke.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

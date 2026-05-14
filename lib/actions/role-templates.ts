'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ALL_CAPABILITIES, type Capability } from '@/lib/auth/capabilities';
import { requireCapability } from '@/lib/auth/require-capability';
import { writeAudit } from '@/lib/services/audit-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { setUserCapabilitiesAction } from '@/lib/actions/staff-capabilities';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string()).default([]),
});

/**
 * Create or update a role template along with its capability set.
 */
export async function upsertRoleTemplateAction(
  input: z.infer<typeof upsertSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.manage');
    const parsed = upsertSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const valid = new Set<string>(ALL_CAPABILITIES);
    for (const c of parsed.data.capabilities) {
      if (!valid.has(c)) return fail(`Unknown capability: ${c}`, 'VALIDATION');
    }

    const sb = createClient();
    let id = parsed.data.id;
    if (id) {
      const { error } = await sb
        .from('staff_role_templates')
        .update({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) return fail(error.message, 'DB');
    } else {
      const { data, error } = await sb
        .from('staff_role_templates')
        .insert({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          created_by: me.id,
        })
        .select('id')
        .single();
      if (error) return fail(error.message, 'DB');
      id = data.id;
    }

    // Replace capability set: delete then re-insert (cleanest, low row counts)
    await sb.from('staff_role_template_capabilities').delete().eq('template_id', id);
    if (parsed.data.capabilities.length > 0) {
      const rows = parsed.data.capabilities.map((c) => ({ template_id: id, capability: c }));
      const { error: capErr } = await sb.from('staff_role_template_capabilities').insert(rows);
      if (capErr) return fail(capErr.message, 'DB');
    }

    await writeAudit({
      action: parsed.data.id ? 'role_template.update' : 'role_template.create',
      entity_type: 'role_template',
      entity_id: id!,
      performed_by: me.id,
      details: { name: parsed.data.name, capability_count: parsed.data.capabilities.length },
    });

    revalidatePath('/admin/team/roles');
    return ok({ id: id! });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteRoleTemplateAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.manage');
    const sb = createClient();
    const { error } = await sb
      .from('staff_role_templates')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return fail(error.message, 'DB');
    await writeAudit({
      action: 'role_template.delete',
      entity_type: 'role_template',
      entity_id: id,
      performed_by: me.id,
    });
    revalidatePath('/admin/team/roles');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Apply a role template to a user. Bulk-grants the template's capabilities by
 * calling the existing `setUserCapabilitiesAction` (which audits each diff).
 * Updates `users_profile.active_role_template_id` so the UI can show the badge.
 */
export async function applyRoleTemplateAction(input: {
  user_id: string;
  template_id: string;
}): Promise<ActionResult<{ granted: number; revoked: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.grant_capabilities');
    const sb = createClient();
    const { data: caps, error } = await sb
      .from('staff_role_template_capabilities')
      .select('capability')
      .eq('template_id', input.template_id);
    if (error) return fail(error.message, 'DB');
    const list = (caps ?? []).map((r: any) => r.capability) as Capability[];

    const r = await setUserCapabilitiesAction({
      user_id: input.user_id,
      capabilities: list,
    });
    if (!r.success) return r;

    await sb
      .from('users_profile')
      .update({ active_role_template_id: input.template_id })
      .eq('id', input.user_id);

    await writeAudit({
      action: 'role_template.apply',
      entity_type: 'user',
      entity_id: input.user_id,
      performed_by: me.id,
      details: { template_id: input.template_id, capability_count: list.length },
    });

    revalidatePath(`/admin/team/${input.user_id}`);
    revalidatePath(`/admin/team/${input.user_id}/capabilities`);
    return ok((r as any).data);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Clear the active role template from a user without revoking capabilities.
 * This lets the admin keep manually-granted caps while removing the template badge.
 */
export async function clearRoleTemplateAction(userId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.grant_capabilities');
    const sb = createClient();
    const { error } = await sb
      .from('users_profile')
      .update({ active_role_template_id: null })
      .eq('id', userId);
    if (error) return fail(error.message, 'DB');
    await writeAudit({
      action: 'role_template.clear',
      entity_type: 'user',
      entity_id: userId,
      performed_by: me.id,
    });
    revalidatePath(`/admin/team/${userId}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

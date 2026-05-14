import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  capabilities: string[];
  staff_count: number;
}

/**
 * List all active role templates with their capabilities and how many staff
 * currently have each template applied.
 */
export async function listRoleTemplates(): Promise<RoleTemplate[]> {
  const sb = createClient();
  const { data: rows, error } = await sb
    .from('staff_role_templates')
    .select('id, name, description, created_at, updated_at, is_deleted')
    .eq('is_deleted', false)
    .order('name', { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map((r: any) => r.id);
  const [{ data: caps }, { data: profiles }] = await Promise.all([
    sb.from('staff_role_template_capabilities').select('template_id, capability').in('template_id', ids),
    sb.from('users_profile').select('active_role_template_id').in('active_role_template_id', ids),
  ]);

  const capMap: Record<string, string[]> = {};
  for (const c of caps ?? []) {
    const k = (c as any).template_id;
    capMap[k] = capMap[k] ?? [];
    capMap[k].push((c as any).capability);
  }
  const staffCount: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const k = (p as any).active_role_template_id;
    if (k) staffCount[k] = (staffCount[k] ?? 0) + 1;
  }

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    created_at: r.created_at,
    updated_at: r.updated_at,
    capabilities: capMap[r.id] ?? [],
    staff_count: staffCount[r.id] ?? 0,
  }));
}

export async function getRoleTemplate(id: string): Promise<RoleTemplate | null> {
  const sb = createClient();
  const { data: row, error } = await sb
    .from('staff_role_templates')
    .select('id, name, description, created_at, updated_at')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: caps } = await sb
    .from('staff_role_template_capabilities')
    .select('capability')
    .eq('template_id', id);
  return {
    id: (row as any).id,
    name: (row as any).name,
    description: (row as any).description,
    created_at: (row as any).created_at,
    updated_at: (row as any).updated_at,
    capabilities: (caps ?? []).map((c: any) => c.capability),
    staff_count: 0,
  };
}

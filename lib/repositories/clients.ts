import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function listAccessibleClients() {
  const sb = createClient();
  const { data, error } = await sb
    .from('clients')
    .select('id, business_name, pan, gstin, category, lifecycle_stage, primary_contact_person, primary_contact_email, primary_owner_id, group_id, portal_enabled, created_at, updated_at, client_groups!clients_group_id_fkey(name)')
    .eq('is_deleted', false)
    .order('business_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getClientById(id: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('clients')
    .select('*, client_groups!clients_group_id_fkey(name)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listClientGroups() {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_groups')
    .select('id, name, description')
    .eq('is_deleted', false)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listTeamUsers() {
  const sb = createClient();
  const { data, error } = await sb
    .from('users_profile')
    .select('id, full_name, email, role, is_active')
    .in('role', ['team', 'admin'])
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function listClientUsers(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_users')
    .select('id, role_in_client, is_active, user_id, users_profile!client_users_user_id_fkey(id, full_name, email)')
    .eq('client_id', clientId);
  if (error) throw error;
  return data ?? [];
}

export async function listTeamAssignments(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('team_client_assignment')
    .select('id, role, assigned_from, assigned_to, team_user_id, users_profile!team_client_assignment_team_user_id_fkey(id, full_name, email)')
    .eq('client_id', clientId)
    .order('assigned_from', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientRecord(payload: any) {
  const sb = createClient();
  const { data, error } = await sb
    .from('clients')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientRecord(id: string, payload: any) {
  const sb = createClient();
  const { error } = await sb
    .from('clients')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function assignTeamMember(clientId: string, teamUserId: string, role: string) {
  const sb = createClient();
  const { error } = await sb.from('team_client_assignment').insert({
    client_id: clientId,
    team_user_id: teamUserId,
    role: role,
    assigned_from: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

export async function unassignTeamMember(assignmentId: string) {
  const sb = createClient();
  const { error } = await sb
    .from('team_client_assignment')
    .update({ assigned_to: new Date().toISOString().slice(0, 10) })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function createClientGroupRecord(payload: { name: string; description?: string | null }) {
  const sb = createClient();
  const { data, error } = await sb.from('client_groups').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateClientGroupRecord(id: string, payload: { name?: string; description?: string | null }) {
  const sb = createClient();
  const { error } = await sb.from('client_groups').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteClientGroupRecord(id: string) {
  const sb = createClient();
  const { error } = await sb.from('client_groups').update({ is_deleted: true }).eq('id', id);
  if (error) throw error;
}

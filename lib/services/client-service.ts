import 'server-only';
import * as clientRepo from '@/lib/repositories/clients';
import { createServiceClient } from '@/lib/supabase/service-role';

export async function createClientRecord(data: any) {
  // Business logic here (e.g. formatting, defaults)
  const {
    portal_email,
    portal_password,
    created_by,
    ...clientPayload
  } = data;

  // Format PAN and GSTIN to uppercase
  if (clientPayload.pan) clientPayload.pan = clientPayload.pan.toUpperCase();
  if (clientPayload.gstin) clientPayload.gstin = clientPayload.gstin.toUpperCase();

  // Handle empty strings as nulls for DB
  if (clientPayload.pan === '') clientPayload.pan = null;
  if (clientPayload.gstin === '') clientPayload.gstin = null;
  if (clientPayload.primary_contact_email === '') clientPayload.primary_contact_email = null;

  // Remove portal fields from client insert
  delete clientPayload.portal_email;
  delete clientPayload.portal_password;

  clientPayload.created_by = created_by;

  // 1. Create client record
  const newClient = await clientRepo.createClientRecord(clientPayload);

  // 2. If portal enabled with credentials, create auth user + profile + link
  if (clientPayload.portal_enabled && portal_email && portal_password) {
    const sb = createServiceClient();

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: portal_email.toLowerCase().trim(),
      password: portal_password,
      email_confirm: true,
      user_metadata: {
        full_name: clientPayload.primary_contact_person || clientPayload.business_name,
        role: 'client',
      },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create portal user';
      if (/already.*registered|already.*exists/i.test(msg)) {
        throw new Error(`Portal user creation failed: email already registered`);
      }
      throw new Error(`Portal user creation failed: ${msg}`);
    }

    const authUserId = created.user.id;

    // Insert users_profile row
    const { error: profErr } = await sb.from('users_profile').upsert({
      id: authUserId,
      full_name: clientPayload.primary_contact_person || clientPayload.business_name,
      email: portal_email.toLowerCase().trim(),
      role: 'client',
      is_active: true,
    });

    if (profErr) {
      throw new Error(`Auth user created but profile upsert failed: ${profErr.message}`);
    }

    // Insert client_users link
    const { error: cuErr } = await sb.from('client_users').insert({
      client_id: newClient.id,
      user_id: authUserId,
      role_in_client: 'owner',
      is_active: true,
    });

    if (cuErr) {
      throw new Error(`Profile created but client_users link failed: ${cuErr.message}`);
    }
  }

  return newClient;
}

export async function updateClientRecord(id: string, data: any) {
  const payload = { ...data, updated_at: new Date().toISOString() };

  if (payload.pan) payload.pan = payload.pan.toUpperCase();
  if (payload.gstin) payload.gstin = payload.gstin.toUpperCase();

  if (payload.pan === '') payload.pan = null;
  if (payload.gstin === '') payload.gstin = null;
  if (payload.primary_contact_email === '') payload.primary_contact_email = null;

  return await clientRepo.updateClientRecord(id, payload);
}

export async function assignTeamMember(clientId: string, teamUserId: string, role: string) {
  return await clientRepo.assignTeamMember(clientId, teamUserId, role);
}

export async function unassignTeamMember(assignmentId: string) {
  return await clientRepo.unassignTeamMember(assignmentId);
}

export async function createClientGroupRecord(payload: { name: string; description?: string | null }) {
  return await clientRepo.createClientGroupRecord(payload);
}

export async function updateClientGroupRecord(id: string, payload: { name?: string; description?: string | null }) {
  return await clientRepo.updateClientGroupRecord(id, payload);
}

export async function softDeleteClientGroupRecord(id: string) {
  return await clientRepo.softDeleteClientGroupRecord(id);
}

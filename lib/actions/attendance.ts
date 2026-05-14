'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const geoSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(50000).optional(),
});

/**
 * Check in for today. Optionally captures lat/lng/accuracy from the browser's
 * geolocation API. If the user's profile flag `geo_check_in_required` is true,
 * a check-in without coordinates is rejected.
 */
export async function checkInAction(
  lat?: number,
  lng?: number,
  accuracy?: number,
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const sb = createClient();

    // Enforce geo_check_in_required if set on the profile
    const { data: profile } = await sb
      .from('users_profile')
      .select('geo_check_in_required')
      .eq('id', me.id)
      .maybeSingle();
    if (profile?.geo_check_in_required && (lat == null || lng == null)) {
      return fail('Location is required for check-in. Please enable location access.', 'GEO_REQUIRED');
    }

    // Validate geo payload if provided
    let geo: { lat: number; lng: number; accuracy?: number } | null = null;
    if (lat != null && lng != null) {
      const parsed = geoSchema.safeParse({ lat, lng, accuracy });
      if (!parsed.success) return fail('Invalid coordinates', 'VALIDATION');
      geo = parsed.data;
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const { error } = await sb.from('attendance_logs').upsert(
      {
        user_id: me.id,
        attendance_date: today,
        check_in_time: now,
        status: 'present',
        check_in_lat: geo?.lat ?? null,
        check_in_lng: geo?.lng ?? null,
        check_in_accuracy_m: geo?.accuracy != null ? Math.round(geo.accuracy) : null,
      },
      { onConflict: 'user_id,attendance_date' },
    );
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/attendance');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Check out for today. We deliberately do NOT capture location at check-out
 * (v3 spec — geo-tag is on check-in only).
 */
export async function checkOutAction(): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const sb = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const { data: existing } = await sb
      .from('attendance_logs')
      .select('id')
      .eq('user_id', me.id)
      .eq('attendance_date', today)
      .maybeSingle();
    if (!existing) return fail('No check-in for today', 'NO_CHECKIN');
    const { error } = await sb
      .from('attendance_logs')
      .update({ check_out_time: now })
      .eq('id', (existing as any).id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/attendance');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const overrideSchema = z.object({
  user_id: z.string().uuid(),
  attendance_date: z.string(),
  status: z.enum(['present', 'absent', 'leave', 'work_from_home']),
  leave_type: z.enum(['paid', 'unpaid', 'sick', 'casual', 'comp']).optional(),
  override_reason: z.string().min(1),
});
const upsertSchema = z.object({
  attendance_date: z.string(),
  status: z.enum(['present', 'absent', 'work_from_home', 'leave', 'half_day', 'permission']),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
});

export async function upsertAttendanceAction(input: z.infer<typeof upsertSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const parsed = upsertSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    await sb.from('attendance_logs').upsert(
      {
        user_id: me.id,
        attendance_date: parsed.data.attendance_date,
        status: parsed.data.status,
        check_in_time: parsed.data.check_in_time ?? null,
        check_out_time: parsed.data.check_out_time ?? null,
        is_manually_created: true,
      },
      { onConflict: 'user_id,attendance_date' },
    );
    revalidatePath('/team/attendance');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function overrideAttendanceAction(
  input: z.infer<typeof overrideSchema>,
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'attendance.approve');
    const parsed = overrideSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    await sb.from('attendance_logs').upsert(
      {
        user_id: parsed.data.user_id,
        attendance_date: parsed.data.attendance_date,
        status: parsed.data.status,
        leave_type: parsed.data.leave_type,
        is_manually_created: true,
        override_reason: parsed.data.override_reason,
        overridden_by: me.id,
      },
      { onConflict: 'user_id,attendance_date' },
    );
    revalidatePath('/team/attendance');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

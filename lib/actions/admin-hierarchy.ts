"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { requireCapability } from "@/lib/auth/require-capability";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function promoteToAdminAction(userId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole("admin");
    // Only prime admin or users with promote_to_admin capability can promote
    if (!me.is_prime_admin) {
      await requireCapability(me, "promote_to_admin");
    }

    const sb = createClient();
    const { data: target } = await sb
      .from("users_profile")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!target) return fail("User not found", "NOT_FOUND");
    if (target.role === "admin") return fail("Already an admin", "ALREADY_ADMIN");

    const { error } = await sb
      .from("users_profile")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return fail(error.message, "DB");

    revalidatePath("/admin/team");
    revalidatePath(`/admin/team/${userId}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? "unknown", e?.code ?? "UNKNOWN");
  }
}

export async function demoteAdminAction(userId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole("admin");
    // Only prime admin can demote another admin
    if (!me.is_prime_admin) {
      return fail("Only the prime admin can demote an admin", "FORBIDDEN");
    }

    const sb = createClient();
    const { data: target } = await sb
      .from("users_profile")
      .select("role, is_prime_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!target) return fail("User not found", "NOT_FOUND");
    if (target.role !== "admin") return fail("User is not an admin", "NOT_ADMIN");
    if (target.is_prime_admin) return fail("Cannot demote the prime admin", "FORBIDDEN");

    const { error } = await sb
      .from("users_profile")
      .update({ role: "team", updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return fail(error.message, "DB");

    revalidatePath("/admin/team");
    revalidatePath(`/admin/team/${userId}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? "unknown", e?.code ?? "UNKNOWN");
  }
}

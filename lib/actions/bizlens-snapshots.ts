'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import * as repo from '@/lib/repositories/bizlens-snapshots';

const upsertSchema = z.object({
  client_id: z.string().uuid(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2000).max(2100),
  months_covered: z.number().int().min(1).max(12).default(12),
  data: z.record(z.any()),
});

export async function upsertBizlensSnapshotAction(
  input: z.infer<typeof upsertSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'bizlens.enter');
    const parsed = upsertSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const row = await repo.upsertBizlensSnapshot({ ...parsed.data, created_by: me.id });
    revalidatePath(`/admin/clients/${parsed.data.client_id}/bizlens`);
    return ok({ id: row.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteBizlensSnapshotAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'bizlens.enter');
    await repo.deleteBizlensSnapshot(id);
    revalidatePath('/admin/bizlens');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function listBizlensSnapshotsAction(clientId: string): Promise<ActionResult<repo.BizlensSnapshot[]>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'bizlens.enter');
    const rows = await repo.listBizlensSnapshots(clientId);
    return ok(rows);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

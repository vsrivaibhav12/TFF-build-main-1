'use server';

import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { revalidatePath } from 'next/cache';
import * as bizlensService from '@/lib/services/bizlens-service';
import * as bizlensRepo from '@/lib/repositories/bizlens';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function createBizlensReport(clientId: string, periodMonth: number, periodYear: number, monthsCovered = 1): Promise<ActionResult<bizlensService.BizlensData>> {
  try {
    const user = await requireRole(['admin', 'team']);
    await requireCapability(user, 'bizlens.enter');
    
    const data = await bizlensService.createReport({
      clientId,
      periodMonth,
      periodYear,
      monthsCovered,
      actorId: user.id
    });

    revalidatePath(`/admin/clients/${clientId}/bizlens`);
    revalidatePath(`/team/clients/${clientId}/bizlens`);
    return ok(data);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateBizlensReport(reportId: string, updates: Partial<bizlensService.BizlensData>): Promise<ActionResult<void>> {
  try {
    const user = await requireRole(['admin', 'team']);
    await requireCapability(user, 'bizlens.enter');
    
    await bizlensService.updateReport(reportId, updates);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function getBizlensReports(clientId: string) {
  // Read actions usually don't need ActionResult wrapping if they are simple fetches
  return await bizlensRepo.listReportsByClient(clientId);
}

export async function getBizlensReport(reportId: string) {
  return await bizlensRepo.getReportById(reportId);
}

export async function publishBizlensReport(reportId: string, clientId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireRole(['admin', 'team']);
    await requireCapability(user, 'bizlens.enter');
    
    await bizlensService.publishReport(reportId, clientId, user.id);

    revalidatePath(`/admin/clients/${clientId}/bizlens`);
    revalidatePath(`/team/clients/${clientId}/bizlens`);
    revalidatePath(`/portal/bizlens`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

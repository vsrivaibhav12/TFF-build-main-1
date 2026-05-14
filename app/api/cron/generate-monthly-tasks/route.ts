import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { seedTaskStepsFromSop } from '@/lib/services/task-steps-service';

/**
 * Vercel Cron: Generate recurring tasks from client_sub_services.
 * Supports monthly, quarterly, and annual frequencies.
 *
 * Idempotent (partial unique index uniq_active_task_per_period prevents dupes).
 * Auth: Vercel cron sends `x-vercel-cron: 1` header. We also accept a shared
 * secret query param `?secret=<CRON_SECRET>` for manual triggers.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

function getPeriodLabel(frequency: string, periodMonth: number, periodYear: number, periodQuarter: number): string {
  if (frequency === 'monthly') return `${periodMonth}/${periodYear}`;
  if (frequency === 'quarterly') return `Q${periodQuarter} ${periodYear}`;
  if (frequency === 'annually') return `FY ${periodYear}`;
  return `${periodMonth}/${periodYear}`;
}

function computeDueDate(ss: any, frequency: string, periodYear: number, periodMonth: number, periodQuarter: number): string {
  if (frequency === 'monthly') {
    const dom = Math.min(28, ss.due_day_of_month ?? 28);
    return new Date(periodYear, periodMonth - 1, dom).toISOString().slice(0, 10);
  }
  if (frequency === 'quarterly') {
    const dom = Math.min(28, ss.due_day_of_quarter ?? 15);
    // quarter end month: Q1=Mar(3), Q2=Jun(6), Q3=Sep(9), Q4=Dec(12)
    const quarterEndMonth = periodQuarter * 3;
    return new Date(periodYear, quarterEndMonth - 1, dom).toISOString().slice(0, 10);
  }
  if (frequency === 'annually') {
    const dom = Math.min(28, ss.due_day_of_month ?? 31);
    const dueMonth = ss.due_month ?? 3; // default March
    return new Date(periodYear, dueMonth - 1, dom).toISOString().slice(0, 10);
  }
  const dom = Math.min(28, ss.due_day_of_month ?? 28);
  return new Date(periodYear, periodMonth - 1, dom).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron');
  const secret = request.nextUrl.searchParams.get('secret');
  if (!isCron && secret !== process.env.CRON_SECRET) return unauthorized();

  const sb = createServiceClient();
  const today = new Date();
  const periodMonth = today.getMonth() + 1;
  const periodYear = today.getFullYear();
  const periodQuarter = getQuarter(periodMonth);

  // Pull all active client_sub_services where sub_service is recurring
  const { data: links, error } = await sb
    .from('client_sub_services')
    .select('client_id, sub_service_id, sub_services(id, code, name, frequency, due_day_of_month, due_day_of_quarter, due_month, is_recurring)')
    .eq('is_active', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const l of links ?? []) {
    const ss: any = l.sub_services;
    if (!ss || !ss.is_recurring) {
      skipped++;
      continue;
    }

    const frequency = ss.frequency as string;
    // Determine if we should create a task for this frequency at this time
    let shouldCreate = false;
    let taskPeriodMonth: number | null = null;
    let taskPeriodQuarter: number | null = null;

    if (frequency === 'monthly') {
      shouldCreate = true;
      taskPeriodMonth = periodMonth;
      taskPeriodQuarter = null;
    } else if (frequency === 'quarterly') {
      // Create at the start of each quarter (Jan, Apr, Jul, Oct)
      shouldCreate = periodMonth % 3 === 1;
      taskPeriodMonth = null;
      taskPeriodQuarter = periodQuarter;
    } else if (frequency === 'annually') {
      // Create once a year (default: January)
      const dueMonth = ss.due_month ?? 3;
      // Create 2 months before due date to give lead time
      const createMonth = dueMonth - 2 <= 0 ? dueMonth + 10 : dueMonth - 2;
      shouldCreate = periodMonth === createMonth;
      taskPeriodMonth = null;
      taskPeriodQuarter = null;
    } else {
      skipped++;
      continue;
    }

    if (!shouldCreate) {
      skipped++;
      continue;
    }

    const dueDateStr = computeDueDate(ss, frequency, periodYear, periodMonth, periodQuarter);
    const periodLabel = getPeriodLabel(frequency, periodMonth, periodYear, periodQuarter);

    // Build existence check query
    let exQ = sb
      .from('tasks')
      .select('id')
      .eq('client_id', l.client_id)
      .eq('sub_service_id', l.sub_service_id)
      .eq('period_year', periodYear)
      .eq('is_deleted', false);

    if (taskPeriodMonth !== null) {
      exQ = exQ.eq('period_month', taskPeriodMonth);
    } else if (taskPeriodQuarter !== null) {
      exQ = exQ.eq('period_quarter', taskPeriodQuarter);
    }

    const { data: ex } = await exQ.maybeSingle();
    if (ex) {
      skipped++;
      continue;
    }

    const insertPayload: any = {
      client_id: l.client_id,
      sub_service_id: l.sub_service_id,
      title: `${ss.name} \u2014 ${periodLabel}`,
      status: 'pending',
      priority: 'medium',
      due_date: dueDateStr,
      period_year: periodYear,
      is_recurring: true,
    };
    if (taskPeriodMonth !== null) insertPayload.period_month = taskPeriodMonth;
    if (taskPeriodQuarter !== null) insertPayload.period_quarter = taskPeriodQuarter;

    const { data: created_row, error: insErr } = await sb.from('tasks').insert(insertPayload).select('id').single();
    if (insErr) { errors.push(insErr.message); continue; }
    created++;
    // Copy SOP steps onto the new task
    try {
      await seedTaskStepsFromSop(sb, { task_id: (created_row as any).id, sub_service_id: l.sub_service_id });
    } catch (e: any) {
      errors.push(`SOP copy failed for task ${(created_row as any).id}: ${e?.message ?? 'unknown'}`);
    }
  }

  return NextResponse.json({ ok: true, periodMonth, periodYear, periodQuarter, created, skipped, errors });
}

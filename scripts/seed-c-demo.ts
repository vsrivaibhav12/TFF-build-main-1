/**
 * Additive seed for Group C demo data:
 *   - Ensures a "GST Compliance" service exists with kind='gst'
 *   - Creates a "GSTR-3B Filing" sub-service with 3 SOP steps
 *   - Subscribes the demo client to it
 *   - Creates ONE demo task in 'awaiting_client' status with seeded task_steps
 *
 * Idempotent: safe to re-run. Looks up by business_name, sub_service code,
 * and task title before inserting.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import WS from 'ws';
(globalThis as any).WebSocket = WS;
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  console.log('[seed-c-demo] starting');

  // 1. Find demo client
  const { data: client } = await sb
    .from('clients')
    .select('id, business_name')
    .eq('business_name', '[DEMO] Demo Manufacturing Pvt Ltd')
    .maybeSingle();
  if (!client) {
    throw new Error('Demo client not found. Run scripts/seed.ts first.');
  }
  console.log('[seed-c-demo] client:', client.id);

  // 2. Ensure a service category 'Compliance'
  let { data: cat } = await sb
    .from('service_categories')
    .select('id')
    .eq('name', 'Compliance')
    .maybeSingle();
  if (!cat) {
    const { data: newCat, error } = await sb
      .from('service_categories')
      .insert({ name: 'Compliance', description: 'Tax & regulatory compliance', display_order: 1 })
      .select('id')
      .single();
    if (error) throw error;
    cat = newCat;
  }

  // 3. Ensure a GST service with kind='gst'
  let { data: svc } = await sb
    .from('services')
    .select('id, service_kind')
    .eq('code', 'GST_COMPLIANCE')
    .maybeSingle();
  if (!svc) {
    const { data: newSvc, error } = await sb
      .from('services')
      .insert({
        category_id: cat!.id,
        name: 'GST Compliance',
        code: 'GST_COMPLIANCE',
        description: 'Monthly GST returns + reconciliation',
        service_kind: 'gst',
      })
      .select('id, service_kind')
      .single();
    if (error) throw error;
    svc = newSvc;
  } else if (!svc.service_kind) {
    await sb.from('services').update({ service_kind: 'gst' }).eq('id', svc.id);
  }
  console.log('[seed-c-demo] service:', svc!.id);

  // 4. Sub-service GSTR-3B
  let { data: subsvc } = await sb
    .from('sub_services')
    .select('id')
    .eq('code', 'GSTR_3B')
    .maybeSingle();
  if (!subsvc) {
    const { data: newSub, error } = await sb
      .from('sub_services')
      .insert({
        service_id: svc!.id,
        name: 'GSTR-3B Filing',
        code: 'GSTR_3B',
        description: 'Monthly summary return',
        frequency: 'monthly',
        due_day_of_month: 20,
        is_recurring: true,
        requires_client_input: true,
        is_active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    subsvc = newSub;
  }
  console.log('[seed-c-demo] sub_service:', subsvc!.id);

  // 5. SOP steps (idempotent)
  const sopSteps = [
    { step_order: 1, title: 'Receive sales/purchase data from client', is_required: true, description: 'Confirm period, scope and any exclusions.' },
    { step_order: 2, title: 'Reconcile GSTR-2B vs purchase ITC ledger', is_required: true, description: 'Flag mismatches and follow up before filing.' },
    { step_order: 3, title: 'Compute GST liability + draft return', is_required: true, description: 'Cross-check totals and tax types.' },
    { step_order: 4, title: 'Send draft to reviewer for approval', is_required: true },
    { step_order: 5, title: 'File on GST portal + capture ARN', is_required: true },
    { step_order: 6, title: 'Share filing acknowledgement with client', is_required: false },
  ];
  for (const s of sopSteps) {
    const { data: existing } = await sb
      .from('sub_service_sop_steps')
      .select('id')
      .eq('sub_service_id', subsvc!.id)
      .eq('step_order', s.step_order)
      .maybeSingle();
    if (!existing) {
      await sb.from('sub_service_sop_steps').insert({ sub_service_id: subsvc!.id, ...s });
    }
  }
  console.log('[seed-c-demo] SOP steps ensured');

  // 6. Subscribe demo client to this sub-service
  const { data: existingCss } = await sb
    .from('client_sub_services')
    .select('id')
    .eq('client_id', client.id)
    .eq('sub_service_id', subsvc!.id)
    .maybeSingle();
  if (!existingCss) {
    await sb.from('client_sub_services').insert({
      client_id: client.id,
      sub_service_id: subsvc!.id,
      is_active: true,
    });
  }

  // Also subscribe to the parent service via client_services (for kind gating)
  const { data: existingCs } = await sb
    .from('client_services')
    .select('id')
    .eq('client_id', client.id)
    .eq('service_id', svc!.id)
    .maybeSingle();
  if (!existingCs) {
    await sb.from('client_services').insert({
      client_id: client.id,
      service_id: svc!.id,
      is_active: true,
    });
  }

  // 7. Find team user (assigned to client) for assignee
  const { data: teamUser } = await sb
    .from('users_profile')
    .select('id')
    .eq('email', 'team.demo@fiscalfulcrum.in')
    .maybeSingle();

  // 8. Demo task
  const { data: existingTask } = await sb
    .from('tasks')
    .select('id')
    .eq('title', '[DEMO] GSTR-3B for May 2026')
    .maybeSingle();

  let taskId = existingTask?.id;
  if (!taskId) {
    const { data: newTask, error } = await sb
      .from('tasks')
      .insert({
        client_id: client.id,
        sub_service_id: subsvc!.id,
        title: '[DEMO] GSTR-3B for May 2026',
        description: 'Standard monthly GST summary return for the demo client.',
        status: 'in_progress',
        is_blocked_on_client: true,
        priority: 'high',
        due_date: '2026-06-20',
        period_year: 2026,
        period_month: 5,
        assigned_to: teamUser?.id ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    taskId = newTask.id;
    console.log('[seed-c-demo] created demo task:', taskId);
  } else {
    console.log('[seed-c-demo] reusing existing task:', taskId);
  }

  // 9. Seed task_steps from SOP (only if not already seeded)
  const { data: stepsExist } = await sb
    .from('task_steps')
    .select('id')
    .eq('task_id', taskId)
    .limit(1);
  if (!stepsExist || stepsExist.length === 0) {
    const { data: sop } = await sb
      .from('sub_service_sop_steps')
      .select('id, step_order, title, description, is_required')
      .eq('sub_service_id', subsvc!.id)
      .eq('is_deleted', false)
      .order('step_order', { ascending: true });
    if (sop && sop.length > 0) {
      const rows = sop.map((s: any) => ({
        task_id: taskId,
        step_order: s.step_order,
        title: s.title,
        description: s.description ?? null,
        is_required: s.is_required ?? true,
        source_sop_step_id: s.id,
      }));
      await sb.from('task_steps').insert(rows);
      console.log(`[seed-c-demo] seeded ${rows.length} task_steps`);
    }
  }

  console.log('[seed-c-demo] DONE');
}

main().catch((e) => {
  console.error('[seed-c-demo] FATAL', e?.message ?? e);
  process.exit(1);
});

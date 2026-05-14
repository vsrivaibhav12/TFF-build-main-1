import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron: send daily due-date alerts for tasks due in the next 3 days
 * to the team member assigned (and admin if no assignee).
 */
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron');
  const secret = request.nextUrl.searchParams.get('secret');
  if (!isCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = createServiceClient();
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 3);

  const { data: tasks, error } = await sb
    .from('tasks')
    .select('id, title, due_date, assigned_to, client_id, status, clients(business_name), users_profile!tasks_assigned_to_fkey(email, full_name)')
    .eq('is_deleted', false)
    .in('status', ['pending', 'in_progress'])
    .gte('due_date', today.toISOString().slice(0, 10))
    .lte('due_date', cutoff.toISOString().slice(0, 10));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by assignee email
  const byEmail = new Map<string, any[]>();
  for (const t of tasks ?? []) {
    const email = (t as any).users_profile?.email;
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email)!.push(t);
  }

  let sent = 0;
  for (const [email, list] of byEmail) {
    const html = renderDueAlertHtml(list);
    const r = await sendEmail({
      to: email,
      subject: `${list.length} task${list.length === 1 ? '' : 's'} due in next 3 days — The Fiscal Fulcrum`,
      html,
    });
    if (r.ok) sent++;
  }

  return NextResponse.json({ ok: true, taskCount: tasks?.length ?? 0, recipients: byEmail.size, sent });
}

function renderDueAlertHtml(tasks: any[]) {
  const rows = tasks
    .map(
      (t) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e4e4e7">${escape(t.title)}</td><td style="padding:6px 8px;border-bottom:1px solid #e4e4e7">${escape(t.clients?.business_name || '—')}</td><td style="padding:6px 8px;border-bottom:1px solid #e4e4e7">${escape(t.due_date || '—')}</td><td style="padding:6px 8px;border-bottom:1px solid #e4e4e7">${escape(t.status)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#18181b">
  <div style="max-width:600px;margin:24px auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px">
    <h2 style="margin:0 0 8px;color:#18181b">Daily task alerts</h2>
    <p style="margin:0 0 16px;color:#71717a">${tasks.length} task${tasks.length === 1 ? '' : 's'} due within the next 3 days.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="text-align:left;color:#71717a"><th style="padding:6px 8px">Task</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Due</th><th style="padding:6px 8px">Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:24px 0 0;color:#0d9488">The Fiscal Fulcrum</p>
  </div></body></html>`;
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

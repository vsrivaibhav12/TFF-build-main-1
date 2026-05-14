import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Notification digest cron. Every day at 04:00 UTC (09:30 IST):
 *  - daily-frequency users: aggregate last-24h notifications and email a digest
 *  - weekly-frequency users: aggregate last 7d on Sundays only
 *  - 'immediate' users: skipped (already emailed at notify time)
 *  - 'off' users: skipped
 */
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron');
  const secret = request.nextUrl.searchParams.get('secret');
  if (!isCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = createServiceClient();
  const today = new Date();
  const dow = today.getUTCDay();
  const isSunday = dow === 0;

  // Pull all preferences
  const { data: prefs } = await sb.from('notification_preferences').select('user_id, email_frequency').in('email_frequency', ['daily', 'weekly']);
  const sentTo: string[] = [];
  for (const p of prefs ?? []) {
    const freq = (p as any).email_frequency;
    if (freq === 'weekly' && !isSunday) continue;
    const window = freq === 'daily' ? 24 : 24 * 7;
    const cutoff = new Date(today.getTime() - window * 3600 * 1000).toISOString();
    const { data: items } = await sb
      .from('notifications')
      .select('title, message, created_at')
      .eq('user_id', (p as any).user_id)
      .eq('email_sent', false)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!items || items.length === 0) continue;
    const { data: profile } = await sb.from('users_profile').select('email, full_name').eq('id', (p as any).user_id).maybeSingle();
    if (!(profile as any)?.email) continue;
    const html = `<div style="font-family:Inter,Arial;color:#18181b">
      <h2 style="color:#0f766e">The Fiscal Fulcrum</h2>
      <p>Hi ${(profile as any).full_name ?? ''},</p>
      <p>Here’s your ${freq} digest — ${items.length} update${items.length === 1 ? '' : 's'}:</p>
      <ul style="padding-left:18px">${items.map((i: any) => `<li><strong>${i.title}</strong><br>${i.message}</li>`).join('')}</ul>
    </div>`;
    await sendEmail({ to: (profile as any).email, subject: `[TFF] ${freq === 'daily' ? 'Daily' : 'Weekly'} digest · ${items.length} update(s)`, html });
    // Mark these as emailed
    await sb.from('notifications').update({ email_sent: true }).eq('user_id', (p as any).user_id).in('title', items.map((i: any) => i.title));
    sentTo.push((profile as any).email);
  }
  return NextResponse.json({ digests_sent: sentTo.length, recipients: sentTo });
}

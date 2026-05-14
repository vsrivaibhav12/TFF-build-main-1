import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/resend';
import { notify } from '@/lib/services/notification-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily DSC expiry alerts. Sends one email per holder + admins for any
 * DSC expiring within the next 30 days that hasn't already been alerted.
 */
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron');
  const secret = request.nextUrl.searchParams.get('secret');
  if (!isCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = createServiceClient();
  const today = new Date();
  const horizon = new Date(today.getTime() + 30 * 86_400_000);

  const { data: rows } = await sb
    .from('dsc_records')
    .select('id, client_id, holder_name, holder_contact_email, expiry_date, expiry_alert_sent, clients(business_name, primary_contact_email, primary_owner_id)')
    .eq('is_deleted', false)
    .eq('status', 'active')
    .gte('expiry_date', today.toISOString().slice(0, 10))
    .lte('expiry_date', horizon.toISOString().slice(0, 10));

  const sent: string[] = [];
  for (const d of rows ?? []) {
    if ((d as any).expiry_alert_sent) continue;
    const businessName = (d as any).clients?.business_name ?? 'Client';
    const subject = `DSC expiring soon — ${businessName} · ${(d as any).holder_name}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;color:#18181b"><h2>The Fiscal Fulcrum</h2><p>The DSC for <strong>${(d as any).holder_name}</strong> at <strong>${businessName}</strong> expires on <strong>${(d as any).expiry_date}</strong>.</p><p>Renew before expiry to avoid filing disruptions.</p></div>`;

    if ((d as any).holder_contact_email) {
      await sendEmail({ to: (d as any).holder_contact_email, subject, html });
      sent.push(`holder:${(d as any).holder_contact_email}`);
    }
    if ((d as any).clients?.primary_contact_email) {
      await sendEmail({ to: (d as any).clients.primary_contact_email, subject, html });
      sent.push(`client:${(d as any).clients.primary_contact_email}`);
    }
    // Notify primary owner via in-app + their pref-based email
    if ((d as any).clients?.primary_owner_id) {
      await notify({
        user_id: (d as any).clients.primary_owner_id,
        type: 'compliance_due',
        title: 'DSC expiring soon',
        message: `${(d as any).holder_name} (${businessName}) DSC expires on ${(d as any).expiry_date}.`,
        related_entity_type: 'dsc_record',
        related_entity_id: (d as any).id,
      });
    }

    await sb.from('dsc_records').update({ expiry_alert_sent: true, expiry_alert_sent_date: today.toISOString().slice(0, 10) }).eq('id', (d as any).id);
  }

  return NextResponse.json({ checked: (rows ?? []).length, sent });
}

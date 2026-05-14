import 'server-only';
import { Resend } from 'resend';

let client: Resend | null = null;

function getResend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY missing');
    client = new Resend(key);
  }
  return client;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@fiscalfulcrum.in';
  try {
    const r = await getResend().emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (r.error) return { ok: false, error: r.error.message };
    return { ok: true, id: r.data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown_error' };
  }
}

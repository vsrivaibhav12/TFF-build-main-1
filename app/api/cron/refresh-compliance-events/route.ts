import { NextResponse, type NextRequest } from 'next/server';
import { refreshComplianceEvents } from '@/lib/services/compliance-calendar-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Nightly refresh of compliance_calendar_events.
 * Authenticated via CRON_SECRET (Vercel cron header) OR the request must come
 * from a Vercel cron (User-Agent contains 'vercel-cron'). Local dev: query ?secret=…
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  const ua = req.headers.get('user-agent') ?? '';
  const isVercelCron = ua.toLowerCase().includes('vercel-cron');
  if (!isVercelCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const r = await refreshComplianceEvents();
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}

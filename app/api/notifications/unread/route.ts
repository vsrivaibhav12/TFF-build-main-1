import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { countUnreadNotifications, listNotifications } from '@/lib/repositories/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ count: 0, items: [] }, { status: 200 });
  const [count, items] = await Promise.all([
    countUnreadNotifications(me.id),
    listNotifications(me.id, 8),
  ]);
  return NextResponse.json({ count, items });
}

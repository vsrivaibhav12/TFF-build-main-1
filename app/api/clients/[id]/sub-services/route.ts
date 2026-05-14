import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { listClientSubServices } from '@/lib/repositories/client-sub-services';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ items: [] }, { status: 401 });
  const items = await listClientSubServices(params.id);
  return NextResponse.json({ items });
}

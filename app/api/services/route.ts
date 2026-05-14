import { NextResponse } from 'next/server';
import { listServices } from '@/lib/repositories/services';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listServices();
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { listSubServices } from '@/lib/repositories/services';
import { requireRole } from '@/lib/auth/require-role';

export async function GET() {
  await requireRole(['admin', 'team']);
  const items = await listSubServices();
  return NextResponse.json({ items });
}

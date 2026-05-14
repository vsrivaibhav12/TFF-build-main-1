import { NextRequest, NextResponse } from 'next/server';
import { listTaskTemplates } from '@/lib/repositories/task-templates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const subServiceId = request.nextUrl.searchParams.get('sub_service_id');
  if (!subServiceId) {
    return NextResponse.json({ error: 'sub_service_id is required' }, { status: 400 });
  }
  try {
    const templates = await listTaskTemplates(subServiceId);
    return NextResponse.json({ items: templates });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

/**
 * Legacy BizLens snapshot route — REMOVED in v3 native port.
 *
 * The iframe-driven `state_json` blob has been replaced by columnar
 * `bizlens_data` rows. Read via server components or server actions in
 * `lib/actions/bizlens-actions.ts`. Returning 410 Gone here so any stale
 * callers fail loudly instead of silently 404-ing.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { error: 'gone', message: 'Replaced by native BizLens server actions in v3.' },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'gone', message: 'Replaced by native BizLens server actions in v3.' },
    { status: 410 },
  );
}

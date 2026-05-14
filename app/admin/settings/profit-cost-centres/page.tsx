import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CentresAdmin from './centres-admin';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProfitCostCentresPage() {
  const sb = createClient();
  const [{ data: pcs }, { data: ccs }] = await Promise.all([
    sb.from('profit_centres').select('code, name, description, is_active').order('code'),
    sb.from('cost_centres').select('code, name, description, is_active').order('code'),
  ]);
  return (
    <div className="space-y-8 max-w-4xl">
      <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Settings
      </Link>
      <div>
        <h1 className="tff-page-title">Profit &amp; cost centres</h1>
        <p className="tff-page-subtitle">
          Two-character (or short) codes used to slice tasks, work-done, and reports.
          Suggested split: <code className="bg-zinc-100 px-1 rounded text-[11px]">CAS</code> for CaaS,
          {' '}<code className="bg-zinc-100 px-1 rounded text-[11px]">BIZ</code> for BizLens,
          {' '}<code className="bg-zinc-100 px-1 rounded text-[11px]">VCFO</code> for vCFO advisory.
        </p>
      </div>
      <CentresAdmin
        kind="profit"
        title="Profit centres"
        rows={(pcs ?? []) as any}
      />
      <CentresAdmin
        kind="cost"
        title="Cost centres"
        rows={(ccs ?? []) as any}
      />
    </div>
  );
}

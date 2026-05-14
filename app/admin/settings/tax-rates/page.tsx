import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { listIncomeTaxSlabs } from '@/lib/repositories/income-tax';
import TaxRatesAdmin from './tax-rates-admin';

export const dynamic = 'force-dynamic';

export default async function TaxRatesPage() {
  await requireRole('admin');
  const slabs = await listIncomeTaxSlabs();
  return (
    <div className="tff-stack-lg">
      <div>
        <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to settings
        </Link>
        <h1 className="tff-page-title">Income tax slab rates</h1>
        <p className="tff-page-subtitle">Configure tax slabs per category and assessment year.</p>
      </div>
      <TaxRatesAdmin initialSlabs={slabs as any} />
    </div>
  );
}

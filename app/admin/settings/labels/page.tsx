import Link from 'next/link';
import { listLabels } from '@/lib/repositories/task-custom-fields';
import LabelsAdmin from './labels-admin';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LabelsPage() {
  const labels = await listLabels();
  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Back to settings
      </Link>
      <div>
        <h1 className="tff-page-title">Task labels</h1>
        <p className="tff-page-subtitle">Flat tag system for tasks — admin-defined master list, multi-select per task.</p>
      </div>
      <LabelsAdmin initial={labels} />
    </div>
  );
}

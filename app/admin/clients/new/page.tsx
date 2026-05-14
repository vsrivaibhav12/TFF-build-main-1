import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listClientGroups } from '@/lib/repositories/clients';
import { ClientCreateForm } from './client-create-form';

export const dynamic = 'force-dynamic';

export default async function NewClientPage() {
  const groups = await listClientGroups();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Back to clients
      </Link>
      <div>
        <h1 className="tff-page-title">New client</h1>
        <p className="tff-page-subtitle">Most fields are optional. Only Business name is required.</p>
      </div>
      <ClientCreateForm groups={groups as any} />
    </div>
  );
}

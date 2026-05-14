import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { listClientGroups } from '@/lib/repositories/clients';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ClientGroupsClient from './client-groups-client';

export const dynamic = 'force-dynamic';

export default async function ClientGroupsPage() {
  await requireRole('admin');
  const groups = await listClientGroups();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="tff-page-title">Client groups</h1>
          <p className="tff-page-subtitle">Organise clients into segments for reporting and filtering.</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          body="Create groups like 'Premium', 'Startups', or 'Manufacturing' to segment your client base."
          icon={<Users className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <ClientGroupsClient groups={groups as any} />
      )}
    </div>
  );
}

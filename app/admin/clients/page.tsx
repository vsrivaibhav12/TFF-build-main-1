import Link from 'next/link';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listSavedViews } from '@/lib/actions/saved-views';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Upload, Users } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import ClientsTableClient from './clients-table-client';

export const dynamic = 'force-dynamic';

export default async function AdminClientsList() {
  const [clients, views] = await Promise.all([listAccessibleClients(), listSavedViews('admin.clients')]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="tff-page-title">Clients</h1>
          <p className="tff-page-subtitle">Your firm&apos;s client roster.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/clients/groups"><Users className="h-4 w-4 mr-1" /> Groups</Link>
          </Button>
          <Button variant="outline" asChild data-testid="bulk-import-btn">
            <Link href="/admin/clients/import"><Upload className="h-4 w-4 mr-1" /> Bulk import</Link>
          </Button>
          <Button asChild data-testid="new-client-btn">
            <Link href="/admin/clients/new"><Plus className="h-4 w-4 mr-1" /> New client</Link>
          </Button>
        </div>
      </div>

      <SavedViewsBar scope="admin.clients" views={views as any} />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Onboard your first client and start tracking compliance, tasks, and queries in one place."
          actionHref="/admin/clients/new"
          actionLabel="Create client"
          icon={<Building2 className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <ClientsTableClient clients={clients.map((c: any) => ({ ...c, group_name: c.client_groups?.name ?? null })) as any} />
      )}
    </div>
  );
}

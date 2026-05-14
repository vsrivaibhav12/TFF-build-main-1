import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getClientById, listClientUsers, listTeamAssignments, listTeamUsers, listClientGroups } from '@/lib/repositories/clients';
import { listClientServices, listClientSubServices } from '@/lib/repositories/services';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import AuditTimeline from '@/components/sophistication/audit-timeline';
import ClientForm from '../client-form';
import ClientServiceManager from './service-manager';
import ClientTeamManager from './team-manager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminClientDetail({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();
  const [groups, owners, clientServices, clientSubServices, clientUsers, teamAssignments, auditLogs] = await Promise.all([
    listClientGroups(),
    listTeamUsers(),
    listClientServices(params.id),
    listClientSubServices(params.id),
    listClientUsers(params.id),
    listTeamAssignments(params.id),
    listEntityAuditLogs('client', params.id),
  ]);

  return (
    <div className="space-y-8">
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Back to clients
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="tff-page-title">{client.business_name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="teal">{client.lifecycle_stage}</Badge>
            {client.pan && <span className="text-sm text-zinc-500 font-mono">PAN {client.pan}</span>}
            {client.gstin && <span className="text-sm text-zinc-500 font-mono">GSTIN {client.gstin}</span>}
          </div>
        </div>
      </div>

      {/* TFF Rebuild Plan v1.0 §5.2 — 4 tabs only */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ClientForm groups={groups} owners={owners} initial={client} />
        </TabsContent>
        <TabsContent value="services">
          <ClientServiceManager
            clientId={client.id}
            existingSubServices={clientSubServices as any}
            existingServices={clientServices as any}
            teamUsers={owners as any}
          />
        </TabsContent>
        <TabsContent value="team">
          <ClientTeamManager
            clientId={client.id}
            assignments={teamAssignments as any}
            availableTeam={owners}
            clientUsers={clientUsers as any}
          />
        </TabsContent>
        <TabsContent value="activity">
          <div className="bg-white rounded-xl border border-zinc-200 p-8">
            <h3 className="text-lg font-semibold mb-6">Client activity log</h3>
            <AuditTimeline entries={auditLogs as any} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

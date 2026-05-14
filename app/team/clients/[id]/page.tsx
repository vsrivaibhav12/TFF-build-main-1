import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientById } from '@/lib/repositories/clients';
import { listClientSubServices } from '@/lib/repositories/services';
import { listTasks } from '@/lib/repositories/tasks';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import AuditTimeline from '@/components/sophistication/audit-timeline';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, History, TrendingUp } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeamClientDetail({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();
  const [subs, tasks, auditLogs] = await Promise.all([
    listClientSubServices(params.id),
    listTasks({ clientId: params.id, limit: 50 }),
    listEntityAuditLogs('client', params.id),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/team/clients"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <div>
        <h1 className="tff-page-title">{client.business_name}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant="teal">{client.lifecycle_stage}</Badge>
          {client.pan && (
            <span className="text-sm font-mono text-zinc-500">{client.pan}</span>
          )}
          {client.gstin && (
            <span className="text-sm font-mono text-zinc-500">{client.gstin}</span>
          )}
        </div>
      </div>

      {/* TFF Rebuild Plan v1.0 §6.2 — staff see assigned clients only, no data-entry quick links */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <History className="h-3.5 w-3.5 mr-1" /> Activity
          </TabsTrigger>
          <TabsTrigger value="vcfo" data-testid="tab-vcfo">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> vCFO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-200 p-6 bg-white">
              <h3 className="font-semibold mb-3">Contact</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-500">Person</dt>
                  <dd>{client.primary_contact_person || '—'}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Email</dt>
                  <dd>{client.primary_contact_email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Phone</dt>
                  <dd>{client.primary_contact_phone || '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border border-zinc-200 p-6 bg-white">
              <h3 className="font-semibold mb-3">Subscribed sub-services</h3>
              {subs.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  None yet. Ask your admin to assign a service to unlock data-entry modules.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {subs.map((s: any) => (
                    <li key={s.id} className="flex justify-between">
                      <span>{s.sub_services?.name}</span>
                      <Badge variant="outline">{s.sub_services?.frequency}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 p-8 bg-zinc-50 text-zinc-500 text-sm">
              No tasks yet.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white divide-y">
              {tasks.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/team/tasks/${t.id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50"
                >
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-zinc-500">
                      due {formatDateIST(t.due_date)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      t.status === 'completed'
                        ? 'success'
                        : t.status === 'in_progress'
                        ? 'teal'
                        : 'warning'
                    }
                  >
                    {t.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <div className="bg-white rounded-xl border border-zinc-200 p-8">
            <h3 className="text-lg font-semibold mb-6">Client activity log</h3>
            <AuditTimeline entries={auditLogs as any} />
          </div>
        </TabsContent>

        <TabsContent value="vcfo">
          <div className="bg-white rounded-xl border border-zinc-200 p-8">
            <h3 className="text-lg font-semibold mb-4">vCFO advisory</h3>
            <p className="text-sm text-zinc-500 mb-4">Cash runway, burn analysis and strategic recommendations.</p>
            <Link
              href={`/team/clients/${params.id}/vcfo`}
              className="inline-flex items-center h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Open vCFO workspace
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

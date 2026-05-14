import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateBizlensDialog } from '@/components/operations/bizlens/create-bizlens-dialog';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function BizLensStudio() {
  await requireRole('admin');
  const sb = createClient();

  const { data: clients, error: clientsErr } = await sb
    .from('clients')
    .select('id, business_name')
    .eq('is_deleted', false)
    .order('business_name');
  if (clientsErr) throw clientsErr;

  const { data: reports, error: reportsErr } = await sb
    .from('bizlens_data')
    .select('id, client_id, period_month, period_year, status')
    .eq('is_current', true)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (reportsErr) throw reportsErr;

  const latestByClient = new Map<string, any>();
  for (const r of reports ?? []) {
    if (!latestByClient.has(r.client_id)) latestByClient.set(r.client_id, r);
  }

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">BizLens</h1>
          <p className="tff-page-subtitle">Centralized data entry and diagnostic generation across all clients.</p>
        </div>
      </div>

      {(!clients || clients.length === 0) ? (
        <EmptyState
          title="No clients yet"
          body="Create a client to start running BizLens diagnostics."
          actionHref="/admin/clients/new"
          actionLabel="New client"
          icon={<Activity className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const report = latestByClient.get(client.id);
            return (
              <div key={client.id} className="tff-card p-5 transition-colors hover:border-teal-300">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100">
                    <Activity className="h-4 w-4 text-teal-600" />
                  </div>
                  {report && (
                    <Badge variant={report.status === 'published' ? 'success' : 'outline'}>
                      {report.status}
                    </Badge>
                  )}
                </div>

                <h3 className="tff-subsection truncate mt-4">{client.business_name}</h3>

                {report ? (
                  <>
                    <div className="mt-3">
                      <div className="tff-kpi-label">Latest period</div>
                      <div className="text-sm font-medium text-zinc-800 mt-0.5">
                        {new Date(report.period_year, (report.period_month || 1) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/admin/bizlens/${report.id}/input`}>Edit data</Link>
                      </Button>
                      <Button size="sm" className="flex-1" asChild>
                        <Link href={`/admin/bizlens/${report.id}/output`}>
                          View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="tff-muted mt-3">No diagnostics yet.</p>
                    <div className="mt-4">
                      <CreateBizlensDialog clientId={client.id} role="admin" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

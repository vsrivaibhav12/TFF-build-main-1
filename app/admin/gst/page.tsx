import { requireRole } from '@/lib/auth/require-role';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listGstFilings } from '@/lib/repositories/compliance';
import { getGstMonthlyDataForClient } from '@/lib/repositories/gst';
import { formatCurrencyINR, formatDateIST } from '@/lib/utils';
import { FileText, ArrowRight, Calculator, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import GstEntryForm from './gst-entry-form';
import GstCharts from '@/components/gst/gst-charts';

export const dynamic = 'force-dynamic';

export default async function AdminGstPage() {
  await requireRole('admin');
  const clients = await listAccessibleClients();

  const clientGstData = await Promise.all(
    clients.map(async (client: any) => {
      const [filings, monthlyData] = await Promise.all([
        listGstFilings(client.id),
        getGstMonthlyDataForClient(client.id),
      ]);
      return { client, filings, monthlyData };
    }),
  );

  const totalFilings = clientGstData.reduce((sum, c) => sum + c.filings.length, 0);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">GST filings</h1>
          <p className="tff-page-subtitle">Record and review GST returns across all clients. {totalFilings} filings on record.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/gst/monthly-data">
            <Button variant="outline" size="sm"><Calculator className="h-4 w-4 mr-1" /> Monthly data</Button>
          </Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Create clients to start recording GST filings."
          icon={<FileText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="space-y-6">
          {clientGstData.map(({ client, filings, monthlyData }) => (
            <div key={client.id} className="tff-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="tff-subsection">{client.business_name}</h3>
                  <p className="tff-caption">{client.gstin || 'No GSTIN'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <GstEntryForm clientId={client.id} clientName={client.business_name} />
                </div>
              </div>

              {monthlyData.length > 0 && (
                <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-teal-600" />
                    <h4 className="text-sm font-semibold text-zinc-800">Monthly summary charts</h4>
                  </div>
                  <GstCharts data={monthlyData as any} clientId={client.id} />
                </div>
              )}

              {filings.length === 0 ? (
                <p className="text-sm text-zinc-500">No GST filings recorded.</p>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white divide-y">
                  {filings.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-medium">
                          {f.return_type} · {f.period_month}/{f.period_year}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {f.filed_date ? `Filed ${formatDateIST(f.filed_date)}` : 'Not filed'} · ack {f.ack_number || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {f.taxable_turnover ? formatCurrencyINR(Number(f.taxable_turnover), { compact: true }) : '—'}
                        </span>
                        <Badge variant={f.status === 'filed' ? 'success' : f.status === 'review' ? 'warning' : 'outline'}>
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

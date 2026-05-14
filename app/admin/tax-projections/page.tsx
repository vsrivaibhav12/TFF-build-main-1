import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { getLatestProjection } from '@/lib/services/tax-projection';
import { computeProjectedTax, advanceTaxSchedule } from '@/lib/services/tax-projection-pure';
import { formatCurrencyINR } from '@/lib/utils';
import { Calculator, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';
import ProjectionForm from './projection-form';

export const dynamic = 'force-dynamic';

export default async function AdminTaxProjectionsPage() {
  await requireRole('admin');
  const clients = await listAccessibleClients();
  const fy = new Date().getFullYear();

  const projections = await Promise.all(
    clients.map(async (client: any) => {
      const data = await getLatestProjection(client.id, fy);
      const gross = (data as any)?.raw_value ?? 0;
      const tdsPaid = (data as any)?.benchmark_value ?? 0;
      const t = computeProjectedTax(gross, 0);
      return {
        client,
        data,
        gross,
        tdsPaid,
        tax: t.tax,
        netDue: Math.max(0, t.tax - tdsPaid),
      };
    }),
  );

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Tax projections</h1>
          <p className="tff-page-subtitle">Enter projected income and TDS for all clients. Computes liability and advance-tax schedule automatically.</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Create clients to start recording tax projections."
          icon={<Calculator className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projections.map(({ client, data, gross, tdsPaid, tax, netDue }) => (
            <div key={client.id} className="tff-card p-5 transition-colors hover:border-teal-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="tff-subsection truncate">{client.business_name}</h3>
                  <p className="tff-caption mt-0.5">FY {fy}</p>
                </div>
                <ProjectionForm clientId={client.id} clientName={client.business_name} existing={data as any} />
              </div>

              {data ? (
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="tff-kpi-label">Gross income</div>
                    <div className="tff-kpi-value mt-1">{formatCurrencyINR(gross)}</div>
                  </div>
                  <div>
                    <div className="tff-kpi-label">Projected tax</div>
                    <div className="tff-kpi-value mt-1">{formatCurrencyINR(tax)}</div>
                  </div>
                  <div>
                    <div className="tff-kpi-label">TDS paid</div>
                    <div className="tff-kpi-value mt-1">{formatCurrencyINR(tdsPaid)}</div>
                  </div>
                  <div>
                    <div className="tff-kpi-label">Net due</div>
                    <div className={`tff-kpi-value mt-1 ${netDue > 0 ? 'text-teal-700' : ''}`}>{formatCurrencyINR(netDue)}</div>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="tff-muted">No projection recorded yet.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

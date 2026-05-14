import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { formatCurrencyINR } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/sophistication/empty-state';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import GstMonthlyForm from '@/components/gst/gst-monthly-form';

export const dynamic = 'force-dynamic';

export default async function GstMonthlyDataPage() {
  await requireRole('admin');
  const sb = createClient();
  const clients = await listAccessibleClients();

  const { data: rows } = await sb
    .from('gst_monthly_data')
    .select('*, clients!gst_monthly_data_client_id_fkey(business_name)')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(200);

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div className="flex items-center gap-2">
          <Link href="/admin/gst" className="text-sm text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="tff-page-title">GST monthly data</h1>
            <p className="tff-page-subtitle">Enter turnover, output tax, ITC, and cash payment data per client per month.</p>
          </div>
        </div>
      </div>

      <GstMonthlyForm clients={clients as any} />

      {(!rows || rows.length === 0) ? (
        <EmptyState title="No data yet" body="Use the form above to enter the first month's GST data." icon={<FileText className="h-6 w-6 text-zinc-400" />} />
      ) : (
        <div className="tff-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Taxable turnover</TableHead>
                <TableHead className="text-right">Output tax</TableHead>
                <TableHead className="text-right">ITC (2B)</TableHead>
                <TableHead className="text-right">Cash paid</TableHead>
                <TableHead className="text-right">Carry forward</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => {
                const outputTax = (r.output_cgst || 0) + (r.output_sgst || 0) + (r.output_igst || 0) + (r.output_cess || 0);
                const itc2b = (r.input_2b_cgst || 0) + (r.input_2b_sgst || 0) + (r.input_2b_igst || 0) + (r.input_2b_cess || 0);
                const cash = (r.tax_paid_cash_cgst || 0) + (r.tax_paid_cash_sgst || 0) + (r.tax_paid_cash_igst || 0) + (r.tax_paid_cash_cess || 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r.clients as any)?.business_name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{r.period_month}/{r.period_year}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrencyINR(r.turnover_taxable)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrencyINR(outputTax)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrencyINR(itc2b)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrencyINR(cash)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrencyINR(r.carry_forward_itc)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

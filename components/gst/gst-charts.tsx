'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BarChart from '@/components/charts/bar-chart';
import LineChart from '@/components/charts/line-chart';
import PieChart from '@/components/charts/pie-chart';
import StackedBarChart from '@/components/charts/stacked-bar-chart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface GstRow {
  period_month: number;
  period_year: number;
  turnover_taxable: number;
  turnover_exempt: number;
  turnover_nil_rated: number;
  turnover_zero_rated: number;
  output_cgst: number;
  output_sgst: number;
  output_igst: number;
  output_cess: number;
  input_2b_cgst: number;
  input_2b_sgst: number;
  input_2b_igst: number;
  input_2b_cess: number;
  input_books_cgst: number;
  input_books_sgst: number;
  input_books_igst: number;
  input_books_cess: number;
  tax_paid_cash_cgst: number;
  tax_paid_cash_sgst: number;
  tax_paid_cash_igst: number;
  tax_paid_cash_cess: number;
  carry_forward_itc: number;
  vendor_filing_percent: number;
}

interface Props {
  data: GstRow[];
  clientId: string;
}

function fmtLabel(r: GstRow) {
  const m = r.period_month.toString().padStart(2, '0');
  return `${m}/${r.period_year}`;
}

export default function GstCharts({ data, clientId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState('turnover');

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.period_year !== b.period_year) return a.period_year - b.period_year;
      return a.period_month - b.period_month;
    });
  }, [data]);

  const categories = useMemo(() => sorted.map(fmtLabel), [sorted]);

  const turnoverSeries = useMemo(() => [
    { name: 'Taxable', data: sorted.map(r => r.turnover_taxable || 0) },
    { name: 'Exempt', data: sorted.map(r => r.turnover_exempt || 0) },
    { name: 'Nil-rated', data: sorted.map(r => r.turnover_nil_rated || 0) },
    { name: 'Zero-rated', data: sorted.map(r => r.turnover_zero_rated || 0) },
  ], [sorted]);

  const outputTaxSeries = useMemo(() => [
    { name: 'CGST', data: sorted.map(r => r.output_cgst || 0) },
    { name: 'SGST', data: sorted.map(r => r.output_sgst || 0) },
    { name: 'IGST', data: sorted.map(r => r.output_igst || 0) },
    { name: 'CESS', data: sorted.map(r => r.output_cess || 0) },
  ], [sorted]);

  const itcCompareSeries = useMemo(() => [
    { name: 'ITC as per 2B', data: sorted.map(r => (r.input_2b_cgst || 0) + (r.input_2b_sgst || 0) + (r.input_2b_igst || 0) + (r.input_2b_cess || 0)) },
    { name: 'ITC as per books', data: sorted.map(r => (r.input_books_cgst || 0) + (r.input_books_sgst || 0) + (r.input_books_igst || 0) + (r.input_books_cess || 0)) },
  ], [sorted]);

  const cashPaidSeries = useMemo(() => [
    { name: 'CGST', data: sorted.map(r => r.tax_paid_cash_cgst || 0) },
    { name: 'SGST', data: sorted.map(r => r.tax_paid_cash_sgst || 0) },
    { name: 'IGST', data: sorted.map(r => r.tax_paid_cash_igst || 0) },
    { name: 'CESS', data: sorted.map(r => r.tax_paid_cash_cess || 0) },
  ], [sorted]);

  const totalTurnoverPie = useMemo(() => {
    if (sorted.length === 0) return [];
    const last = sorted[sorted.length - 1];
    return [
      { name: 'Taxable', value: last.turnover_taxable || 0 },
      { name: 'Exempt', value: last.turnover_exempt || 0 },
      { name: 'Nil-rated', value: last.turnover_nil_rated || 0 },
      { name: 'Zero-rated', value: last.turnover_zero_rated || 0 },
    ];
  }, [sorted]);

  function goToMonthlyData() {
    router.push(`/admin/gst/monthly-data`);
  }

  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">Enter monthly data to see charts.</p>;
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="turnover">Turnover</TabsTrigger>
        <TabsTrigger value="output">Output tax</TabsTrigger>
        <TabsTrigger value="itc">ITC comparison</TabsTrigger>
        <TabsTrigger value="cash">Cash paid</TabsTrigger>
      </TabsList>
      <TabsContent value="turnover">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <StackedBarChart categories={categories} series={turnoverSeries} title="Monthly turnover breakup" height={320} onClick={goToMonthlyData} />
          </div>
          <div>
            <PieChart data={totalTurnoverPie} title={`Latest period turnover`} height={320} onClick={goToMonthlyData} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="output">
        <StackedBarChart categories={categories} series={outputTaxSeries} title="Monthly output tax breakup" height={360} onClick={goToMonthlyData} />
      </TabsContent>
      <TabsContent value="itc">
        <LineChart categories={categories} series={[
          { name: 'ITC as per 2B', data: itcCompareSeries[0].data, color: '#0D9488' },
          { name: 'ITC as per books', data: itcCompareSeries[1].data, color: '#F59E0B' },
        ]} title="ITC: 2B vs books" height={360} onClick={goToMonthlyData} />
      </TabsContent>
      <TabsContent value="cash">
        <StackedBarChart categories={categories} series={cashPaidSeries} title="Tax paid in cash" height={360} onClick={goToMonthlyData} />
      </TabsContent>
    </Tabs>
  );
}

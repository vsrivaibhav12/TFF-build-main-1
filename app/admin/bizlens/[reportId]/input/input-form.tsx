'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BizlensData } from '@/lib/services/bizlens-service';
import { updateBizlensReport, publishBizlensReport } from '@/lib/actions/bizlens-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BizlensStudioInputForm({ report, clientId }: { report: BizlensData; clientId: string }) {
  const [data, setData] = useState<BizlensData>(report);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();

  const handleBlur = async (field: keyof BizlensData, value: any) => {
    if (data[field] === value) return;
    setSaving(true);
    try {
      await updateBizlensReport(report.id as string, { [field]: value });
    } catch (e) {
      toast.error('Failed to auto-save field');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof BizlensData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishBizlensReport(report.id as string, clientId);
      toast.success('Report published successfully');
      router.push(`/admin/clients/${clientId}/bizlens/${report.id}/output`);
    } catch (e) {
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const numInput = (field: keyof BizlensData, label: string, colSpan = 1) => (
    <div className={`grid gap-2 col-span-${colSpan}`}>
      <Label htmlFor={field} className="text-zinc-600 font-semibold">{label}</Label>
      <Input
        id={field}
        type="number"
        className="bg-zinc-50 border-zinc-200 text-lg py-6 rounded-xl"
        value={data[field] === null ? '' : Number(data[field])}
        onChange={(e) => handleChange(field, e.target.value === '' ? 0 : Number(e.target.value))}
        onBlur={(e) => handleBlur(field, e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="rounded-xl">
            <Link href="/admin/bizlens"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Studio</Link>
          </Button>
          <div className="h-6 w-px bg-zinc-200 mx-2" />
          <div className="text-sm">
            <span className="text-zinc-500">Status: </span>
            <span className="font-bold text-amber-600">{data.status === 'published' ? 'Published' : 'Draft'}</span>
          </div>
          {saving && <span className="text-xs font-bold text-teal-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Auto-saving...</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="rounded-xl border-zinc-200 font-bold">
            <Link href={`/admin/clients/${clientId}/bizlens/${report.id}/output`}>Preview Report</Link>
          </Button>
          <Button onClick={handlePublish} disabled={publishing || data.status === 'published'} className="bg-teal-600 hover:bg-teal-700 rounded-xl font-bold px-6 shadow-lg shadow-teal-100">
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publish Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pl" className="w-full">
        <TabsList className="w-full justify-start p-1 bg-zinc-100/50 rounded-2xl overflow-x-auto h-auto">
          <TabsTrigger value="pl" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:shadow-sm">Operating & P&L</TabsTrigger>
          <TabsTrigger value="bs" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:shadow-sm">Balance Sheet</TabsTrigger>
          <TabsTrigger value="ageing" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:shadow-sm">Ageing</TabsTrigger>
          <TabsTrigger value="strategic" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:shadow-sm">Strategy & Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="space-y-6 mt-6">
          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Revenue & Target</CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {numInput('sales_revenue', 'Sales Revenue (₹)')}
              {numInput('target_profit', 'Target Profit (₹)')}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Variable Costs Breakdown</CardTitle>
              <CardDescription className="text-base">Direct costs that scale with revenue.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {numInput('direct_materials', 'Direct Materials (₹)')}
              {numInput('direct_labor', 'Direct Labor (₹)')}
              {numInput('packaging_logistics', 'Packaging & Logistics (₹)')}
              {numInput('other_variable', 'Other Variable (₹)')}
              <div className="col-span-full pt-4">
                <p className="text-sm text-zinc-500 font-medium">Or enter aggregate total if breakdown is unavailable:</p>
                <div className="mt-4 max-w-sm">{numInput('variable_costs', 'Total Variable Costs Override (₹)')}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Fixed Costs Breakdown</CardTitle>
              <CardDescription className="text-base">Overheads that remain constant.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {numInput('rent_lease', 'Rent / Lease (₹)')}
              {numInput('salaries_fixed', 'Salaries - Fixed (₹)')}
              {numInput('utilities', 'Utilities (₹)')}
              {numInput('marketing', 'Marketing (₹)')}
              {numInput('admin_general', 'Admin / General (₹)')}
              <div className="col-span-full pt-4">
                <p className="text-sm text-zinc-500 font-medium">Or enter aggregate total if breakdown is unavailable:</p>
                <div className="mt-4 max-w-sm">{numInput('fixed_costs', 'Total Fixed Costs Override (₹)')}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Other Financials</CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {numInput('purchases', 'Purchases (₹)')}
              {numInput('interest_expense', 'Interest Expense (₹)')}
              {numInput('inventory_change', 'Inventory Change (₹)')}
              {numInput('other_income', 'Other Income (₹)')}
              {numInput('non_cash_expenses', 'Non-Cash Exp (₹)')}
              <div className="col-span-full flex items-center space-x-3 pt-6 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <Switch 
                  id="fc_includes_interest" 
                  checked={Boolean(data.fc_includes_interest)} 
                  onCheckedChange={(c) => { handleChange('fc_includes_interest', c); handleBlur('fc_includes_interest', c); }} 
                />
                <Label htmlFor="fc_includes_interest" className="text-base font-bold">Does Fixed Cost include Interest?</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs" className="space-y-6 mt-6">
          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {numInput('bs_cash', 'Cash & Equivalents (₹)')}
              {numInput('bs_inventory', 'Inventory (₹)')}
              {numInput('bs_accounts_receivable', 'Accounts Receivable (₹)')}
              {numInput('bs_other_current_assets', 'Other Current Assets (₹)')}
              {numInput('bs_loans_advances', 'Loans & Advances (₹)')}
              {numInput('realisable_fixed_assets', 'Realisable Fixed Assets (₹)')}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Liabilities & Equity</CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {numInput('bs_accounts_payable', 'Accounts Payable (₹)')}
              {numInput('bs_short_term_borrowings', 'Short Term Borrowings (₹)')}
              {numInput('bs_long_term_borrowings', 'Long Term Borrowings (₹)')}
              {numInput('bs_current_liabilities_other', 'Other Current Liab. (₹)')}
              {numInput('bs_other_liabilities', 'Other Liabilities (₹)')}
              {numInput('bs_equity', 'Equity / Networth (₹)')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ageing" className="space-y-6 mt-6">
          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="tff-section-title">Debtors Ageing</CardTitle>
                  <CardDescription className="text-base">Breakdown of Accounts Receivable by age.</CardDescription>
                </div>
                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-zinc-200 shadow-sm">
                  <Switch 
                    id="ar_ageing_available" 
                    checked={Boolean(data.ar_ageing_available)} 
                    onCheckedChange={(c) => { handleChange('ar_ageing_available', c); handleBlur('ar_ageing_available', c); }} 
                  />
                  <Label htmlFor="ar_ageing_available" className="font-bold pr-2">Enable</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className={`p-8 grid grid-cols-1 md:grid-cols-4 gap-6 ${!data.ar_ageing_available ? 'opacity-50 pointer-events-none' : ''}`}>
              {numInput('ar_0_30', '0-30 Days (₹)')}
              {numInput('ar_31_60', '31-60 Days (₹)')}
              {numInput('ar_61_90', '61-90 Days (₹)')}
              {numInput('ar_90_plus', '90+ Days (₹)')}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="tff-section-title">Creditors Ageing</CardTitle>
                  <CardDescription className="text-base">Breakdown of Accounts Payable by age.</CardDescription>
                </div>
                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-zinc-200 shadow-sm">
                  <Switch 
                    id="ap_ageing_available" 
                    checked={Boolean(data.ap_ageing_available)} 
                    onCheckedChange={(c) => { handleChange('ap_ageing_available', c); handleBlur('ap_ageing_available', c); }} 
                  />
                  <Label htmlFor="ap_ageing_available" className="font-bold pr-2">Enable</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className={`p-8 grid grid-cols-1 md:grid-cols-4 gap-6 ${!data.ap_ageing_available ? 'opacity-50 pointer-events-none' : ''}`}>
              {numInput('ap_0_30', '0-30 Days (₹)')}
              {numInput('ap_31_60', '31-60 Days (₹)')}
              {numInput('ap_61_90', '61-90 Days (₹)')}
              {numInput('ap_90_plus', '90+ Days (₹)')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategic" className="space-y-6 mt-6">
          <Card className="border-0 shadow-xl shadow-zinc-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="tff-section-title">Concentration Risk & Credit Policy</CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className="tff-subsection">Concentration (%)</h3>
                {numInput('top_customer_pct', 'Top Customer % of Sales')}
                {numInput('top_supplier_pct', 'Top Supplier % of Purchases')}
              </div>
              <div className="space-y-8">
                <h3 className="tff-subsection">Credit Policies</h3>
                <div className="grid gap-2">
                  <Label className="text-zinc-600 font-semibold">Customer Credit Policy</Label>
                  <Select value={data.customer_credit_policy || 'na'} onValueChange={(v) => { handleChange('customer_credit_policy', v); handleBlur('customer_credit_policy', v); }}>
                    <SelectTrigger className="bg-zinc-50 border-zinc-200 text-lg py-6 rounded-xl">
                      <SelectValue placeholder="Select policy type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal Contract</SelectItem>
                      <SelectItem value="practice">Industry Practice</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-zinc-600 font-semibold">Supplier Credit Policy</Label>
                  <Select value={data.supplier_credit_policy || 'na'} onValueChange={(v) => { handleChange('supplier_credit_policy', v); handleBlur('supplier_credit_policy', v); }}>
                    <SelectTrigger className="bg-zinc-50 border-zinc-200 text-lg py-6 rounded-xl">
                      <SelectValue placeholder="Select policy type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal Contract</SelectItem>
                      <SelectItem value="practice">Industry Practice</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="col-span-full space-y-6 mt-4">
                <h3 className="tff-subsection border-t border-zinc-100 pt-8">Strategic Health Flags</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                    <div className="space-y-1">
                      <Label className="text-lg font-bold text-zinc-900">Intentional Negative WC?</Label>
                      <p className="text-sm text-zinc-500 pr-4">Business operates heavily on supplier credit (e.g. FMCG). Negative WC is not a risk but a feature.</p>
                    </div>
                    <Switch checked={Boolean(data.wc_intentional)} onCheckedChange={(c) => { handleChange('wc_intentional', c); handleBlur('wc_intentional', c); }} />
                  </div>
                  <div className="flex items-start justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                    <div className="space-y-1">
                      <Label className="text-lg font-bold text-zinc-900">Strategic AP Delays?</Label>
                      <p className="text-sm text-zinc-500 pr-4">Extended payment terms are negotiated with suppliers, not forced by cash flow constraints.</p>
                    </div>
                    <Switch checked={Boolean(data.ap_strategic)} onCheckedChange={(c) => { handleChange('ap_strategic', c); handleBlur('ap_strategic', c); }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

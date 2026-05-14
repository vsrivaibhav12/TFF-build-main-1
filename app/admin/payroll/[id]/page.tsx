import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPayrollRun } from '@/lib/repositories/payroll';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyINR } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PayrollDetail({ params }: { params: { id: string } }) {
  const run = await getPayrollRun(params.id);
  if (!run) notFound();
  const r: any = run;
  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/admin/payroll" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"><ChevronLeft className="h-4 w-4" /> Back</Link>
      <div>
        <h1 className="tff-page-title">Payslip · {r.users_profile?.full_name}</h1>
        <p className="tff-page-subtitle">{r.month}/{r.year} · <Badge variant={r.status === 'paid' ? 'success' : 'outline'} className="ml-2">{r.status}</Badge></p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-8">
        <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
          {[
            ['Working days', r.total_working_days],
            ['Present days', r.actual_present_days],
            ['Leave days', r.actual_leave_days],
            ['Paid leaves', r.paid_leave_days],
            ['Unpaid leaves', r.unpaid_leave_days],
            ['Daily rate', formatCurrencyINR(r.daily_rate)],
            ['Base salary', formatCurrencyINR(r.base_salary)],
            ['Salary for present days', formatCurrencyINR(r.salary_for_present_days)],
            ['Deduction for excess leaves', formatCurrencyINR(r.deduction_for_excess_leaves)],
            ['Gross salary', formatCurrencyINR(r.gross_salary)],
            ['Total deductions', formatCurrencyINR(r.total_deductions)],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">{k}</span><span className="tabular-nums font-medium">{v}</span></div>
          ))}
          <div className="col-span-2 flex justify-between mt-4 pt-4 border-t-2 border-zinc-300"><span className="text-base font-semibold">Net payable</span><span className="text-2xl font-bold tabular-nums text-teal-700">{formatCurrencyINR(r.final_salary)}</span></div>
        </div>
      </div>
      <p className="text-xs text-zinc-400">PDF download is on the Phase 3 backlog. Payments are recorded by changing status to <code>paid</code> after disbursement.</p>
    </div>
  );
}

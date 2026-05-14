import Link from 'next/link';
import { listPayrollRuns } from '@/lib/repositories/payroll';
import { listTeamUsers } from '@/lib/repositories/clients';
import { getPayrollSettings } from '@/lib/repositories/payroll';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import { Banknote } from 'lucide-react';
import PayrollRunForm from './run-form';
import PayrollSettingsDialog from './payroll-settings-dialog';
import { formatCurrencyINR, formatDateIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PayrollPage() {
  const [runs, team] = await Promise.all([listPayrollRuns(), listTeamUsers()]);
  const settingsMap = new Map<string, any>();
  await Promise.all(
    team.map(async (t: any) => {
      const s = await getPayrollSettings(t.id);
      if (s) settingsMap.set(t.id, s);
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="tff-page-title">Payroll</h1>
          <p className="tff-page-subtitle">Monthly payroll runs computed from attendance + per-user settings.</p>
        </div>
        <PayrollRunForm team={team as any} />
      </div>

      {/* Team settings summary */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Monthly salary</TableHead>
              <TableHead className="text-right">Paid leaves / mo</TableHead>
              <TableHead className="text-center">Adjust for leaves</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((t: any) => {
              const s = settingsMap.get(t.id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s ? formatCurrencyINR(s.monthly_salary) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{s?.paid_leaves_per_month ?? '—'}</TableCell>
                  <TableCell className="text-center">{s?.salary_adjustment_for_leaves ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <PayrollSettingsDialog userId={t.id} userName={t.full_name} existing={s} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          title="No payroll runs yet"
          body="Configure salary settings then run a payroll for the month."
          icon={<Banknote className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Period</TableHead><TableHead>Present / Leave</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{runs.map((r: any) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-zinc-50" data-testid={`payroll-row-${r.id}`}>
                <TableCell className="font-medium"><Link href={`/admin/payroll/${r.id}`} className="hover:underline">{r.users_profile?.full_name}</Link></TableCell>
                <TableCell>{r.month}/{r.year}</TableCell>
                <TableCell className="text-xs">{r.actual_present_days ?? '—'}d / {r.actual_leave_days ?? '—'}d</TableCell>
                <TableCell className="tabular-nums">{formatCurrencyINR(r.gross_salary)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrencyINR(r.total_deductions)}</TableCell>
                <TableCell className="tabular-nums font-semibold">{formatCurrencyINR(r.final_salary)}</TableCell>
                <TableCell><Badge variant={r.status === 'paid' ? 'success' : 'outline'}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Loader2, Save } from 'lucide-react';
import { upsertPayrollSettingsAction } from '@/lib/actions/payroll';

interface Props {
  userId: string;
  userName: string;
  existing?: {
    monthly_salary?: number;
    paid_leaves_per_month?: number;
    deduction_applicable?: boolean;
    salary_adjustment_for_leaves?: boolean;
  } | null;
}

export default function PayrollSettingsDialog({ userId, userName, existing }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [s, setS] = useState({
    monthly_salary: existing?.monthly_salary ?? 0,
    paid_leaves_per_month: existing?.paid_leaves_per_month ?? 2,
    deduction_applicable: existing?.deduction_applicable ?? true,
    salary_adjustment_for_leaves: existing?.salary_adjustment_for_leaves ?? true,
  });

  function save() {
    startTransition(async () => {
      const r = await upsertPayrollSettingsAction({
        user_id: userId,
        monthly_salary: s.monthly_salary,
        paid_leaves_per_month: s.paid_leaves_per_month,
        deduction_applicable: s.deduction_applicable,
        salary_adjustment_for_leaves: s.salary_adjustment_for_leaves,
      });
      if (r.success) {
        toast.success('Payroll settings saved');
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings className="h-3.5 w-3.5 mr-1" /> Settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Payroll settings — {userName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Monthly salary ₹</Label><Input type="number" value={s.monthly_salary} onChange={(e) => setS({ ...s, monthly_salary: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label className="text-xs">Paid leaves / month</Label><Input type="number" min={0} max={31} value={s.paid_leaves_per_month} onChange={(e) => setS({ ...s, paid_leaves_per_month: Number(e.target.value) })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <div>
              <div className="text-sm font-medium">Salary adjustment for leaves</div>
              <div className="text-xs text-zinc-500">Deduct unpaid leave days from salary</div>
            </div>
            <Switch checked={s.salary_adjustment_for_leaves} onCheckedChange={(c) => setS({ ...s, salary_adjustment_for_leaves: c })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <div>
              <div className="text-sm font-medium">Deductions applicable</div>
              <div className="text-xs text-zinc-500">Apply standard deductions (currently leave-only)</div>
            </div>
            <Switch checked={s.deduction_applicable} onCheckedChange={(c) => setS({ ...s, deduction_applicable: c })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={pending}>{pending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5 mr-1" />Save settings</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

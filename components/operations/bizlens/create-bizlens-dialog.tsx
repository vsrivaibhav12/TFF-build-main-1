'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBizlensReport } from '@/lib/actions/bizlens-actions';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  clientId: string;
  role?: 'admin' | 'team';
}

export function CreateBizlensDialog({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [monthsCovered, setMonthsCovered] = useState(1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createBizlensReport(clientId, periodMonth, periodYear, monthsCovered);
    setLoading(false);
    if (res.success) {
      setOpen(false);
      window.location.reload();
    } else {
      alert(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> New report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create BizLens report</DialogTitle>
          <DialogDescription>Select the period for the new diagnostic report.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input id="month" type="number" min={1} max={12} value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" min={2000} max={2100} value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthsCovered">Months covered</Label>
            <Input id="monthsCovered" type="number" min={1} max={12} value={monthsCovered} onChange={(e) => setMonthsCovered(Number(e.target.value))} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

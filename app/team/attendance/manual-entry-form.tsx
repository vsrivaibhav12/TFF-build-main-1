'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { upsertAttendanceAction } from '@/lib/actions/attendance';

export default function ManualAttendanceForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    check_in_time: '09:00',
    check_out_time: '18:00',
  });

  function save() {
    startTransition(async () => {
      const r = await upsertAttendanceAction({
        attendance_date: f.date,
        status: f.status as any,
        check_in_time: `${f.date}T${f.check_in_time}:00+05:30`,
        check_out_time: `${f.date}T${f.check_out_time}:00+05:30`,
      });
      if (r.success) {
        toast.success('Attendance recorded');
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Manual entry</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record attendance manually</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['present', 'absent', 'work_from_home', 'leave', 'half_day', 'permission'].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Check in</Label><Input type="time" value={f.check_in_time} onChange={(e) => setF({ ...f, check_in_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Check out</Label><Input type="time" value={f.check_out_time} onChange={(e) => setF({ ...f, check_out_time: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={pending}>{pending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving…</> : 'Save attendance'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

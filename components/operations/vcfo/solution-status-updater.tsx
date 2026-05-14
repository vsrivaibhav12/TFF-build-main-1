'use client';
import { useState, useTransition } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { updateSolutionStatusAction } from '@/lib/actions/vcfo';

interface Props {
  id: string;
  current: string;
}

const STATUSES = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'closed', label: 'Closed' },
];

export default function SolutionStatusUpdater({ id, current }: Props) {
  const [status, setStatus] = useState(current);
  const [pending, startTransition] = useTransition();

  function onChange(val: string) {
    setStatus(val);
    startTransition(async () => {
      const r = await updateSolutionStatusAction({ id, solution_status: val as any });
      if (r.success) {
        toast.success('Status updated');
      } else {
        toast.error(r.error);
        setStatus(current);
      }
    });
  }

  return (
    <Select value={status} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="h-7 text-xs w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

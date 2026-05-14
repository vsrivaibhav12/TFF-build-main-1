'use client';
import { useRouter } from 'next/navigation';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  fy: number;
  clients: { id: string; business_name: string }[];
  groups: { id: string; name: string }[];
  selectedClient?: string;
  selectedGroup?: string;
}

export default function ClientServicesReportClient({ fy, clients, groups, selectedClient, selectedGroup }: Props) {
  const router = useRouter();

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    const fyVal = formData.get('fy') as string;
    const clientVal = formData.get('client') as string;
    const groupVal = formData.get('group') as string;
    if (fyVal) params.set('fy', fyVal);
    if (clientVal) params.set('client_id', clientVal);
    if (groupVal) params.set('group_id', groupVal);
    router.push(`/admin/reports/client-services?${params.toString()}`);
  }

  return (
    <form action={applyFilters} className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs">FY ending</Label>
        <Input name="fy" type="number" defaultValue={fy} className="w-28 h-9" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Client</Label>
        <Select name="client" defaultValue={selectedClient || 'all'}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Group</Label>
        <Select name="group" defaultValue={selectedGroup || 'all'}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" className="h-9">Apply</Button>
    </form>
  );
}

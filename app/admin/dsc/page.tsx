import Link from 'next/link';
import { listDscRecords } from '@/lib/repositories/dsc';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DscDialog from './dsc-dialog';
import EmptyState from '@/components/sophistication/empty-state';
import { formatDateIST } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { KeyRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DscPage() {
  const [items, clients] = await Promise.all([listDscRecords(), listAccessibleClients()]);
  const today = new Date();
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="tff-page-title">DSC Vault</h1>
          <p className="tff-page-subtitle">Digital signature certificates across the firm. Alerts fire 30 days before expiry.</p>
        </div>
        <DscDialog clients={clients as any}><Button data-testid="dsc-new">New DSC</Button></DscDialog>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No DSCs registered"
          body="Add the first digital signature certificate to start tracking expiries."
          icon={<KeyRound className="h-6 w-6 text-zinc-400" />}
          actionOnClick={() => document.querySelector<HTMLButtonElement>('[data-testid="dsc-new"]')?.click()}
          actionLabel="Add DSC"
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead><TableHead>Holder</TableHead>
                <TableHead>Class / Type</TableHead><TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d: any) => {
                const days = d.expiry_date ? differenceInDays(parseISO(d.expiry_date), today) : null;
                let chip: 'success' | 'warning' | 'danger' | 'outline' = 'outline';
                if (days !== null) {
                  chip = days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success';
                }
                return (
                  <TableRow key={d.id} data-testid={`dsc-row-${d.id}`}>
                    <TableCell className="font-medium">{d.clients?.business_name}</TableCell>
                    <TableCell>{d.holder_name}</TableCell>
                    <TableCell><span className="text-xs">{d.dsc_class} · {d.dsc_type}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatDateIST(d.expiry_date)}</span>
                        {days !== null && (
                          <Badge variant={chip}>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={d.status === 'active' ? 'success' : 'outline'}>{d.status}</Badge></TableCell>
                    <TableCell><DscDialog clients={clients as any} initial={d}><button className="text-xs text-teal-700 hover:underline">Edit</button></DscDialog></TableCell>
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

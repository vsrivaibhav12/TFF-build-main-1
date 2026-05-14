import { listHearings } from '@/lib/repositories/notices';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { ScrollText } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import HearingDialog from '@/components/hearings/hearing-dialog';

export const dynamic = 'force-dynamic';

export default async function HearingsPage() {
  const [items, clients] = await Promise.all([
    listHearings(),
    listAccessibleClients(),
  ]);
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="tff-page-title">Hearings</h1>
          <p className="tff-page-subtitle">Cross-client hearings calendar.</p>
        </div>
        <HearingDialog clients={clients as any} triggerLabel="Schedule hearing" />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No hearings scheduled"
          body="Hearings will appear here when scheduled for your assigned clients."
          icon={<ScrollText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Subject</TableHead><TableHead>Scheduled</TableHead><TableHead>Officer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{items.map((h: any) => (
              <TableRow key={h.id} data-testid={`hearing-row-${h.id}`}>
                <TableCell className="font-medium">{h.clients?.business_name}</TableCell>
                <TableCell><Badge variant="outline">{h.hearing_type ?? '—'}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{h.subject ?? '—'}</TableCell>
                <TableCell>{formatDateIST(h.hearing_scheduled_date)}</TableCell>
                <TableCell>{h.officer_name ?? '—'}</TableCell>
                <TableCell><Badge variant={h.status === 'concluded' ? 'success' : 'warning'}>{h.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

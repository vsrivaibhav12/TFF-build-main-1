import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { ClipboardList, User, Calendar } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface LeaveRow {
  id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
  users_profile: { full_name: string } | null;
}

export default async function AdminLeavePage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: requests } = await sb
    .from('leave_requests')
    .select('id, from_date, to_date, reason, status, users_profile:user_id(full_name)')
    .order('from_date', { ascending: false })
    .limit(100);

  const rows = (requests ?? []) as unknown as LeaveRow[];

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Leave management</h1>
          <p className="tff-page-subtitle">Approve or monitor team time-off requests.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No leave requests"
          body="Team leave requests will appear here once submitted."
          icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-zinc-50/50">
                <TableHead>Team member</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-row>
                  <TableCell>
                    <div className="flex items-center gap-2 text-zinc-900 font-medium">
                      <User className="h-4 w-4 text-zinc-400" />
                      {r.users_profile?.full_name ?? '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        r.status === 'approved'
                          ? 'success'
                          : r.status === 'pending'
                            ? 'warning'
                            : 'destructive'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-700 tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      {formatDateIST(r.from_date)} — {formatDateIST(r.to_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 max-w-xs truncate">{r.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

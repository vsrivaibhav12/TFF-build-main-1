import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listWorkDoneSummary } from '@/lib/repositories/workdone';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SearchParams {
  from?: string;
  to?: string;
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default async function WorkDoneReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'view_workdone_reports');

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const fromIso = searchParams.from ?? defaultFrom;
  const toIso = searchParams.to ?? defaultTo;

  const summary = await listWorkDoneSummary(fromIso, toIso);

  // Aggregate by user
  const byUser: Record<string, { name: string; minutes: number }> = {};
  // Aggregate by client
  const byClient: Record<string, { name: string; minutes: number }> = {};
  for (const r of summary) {
    if (!byUser[r.user_id]) byUser[r.user_id] = { name: r.user_name, minutes: 0 };
    byUser[r.user_id].minutes += r.total_minutes;
    if (!byClient[r.client_id]) byClient[r.client_id] = { name: r.client_name, minutes: 0 };
    byClient[r.client_id].minutes += r.total_minutes;
  }
  const totalMinutes = summary.reduce((s, r) => s + r.total_minutes, 0);

  return (
    <div className="space-y-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div>
        <h1 className="tff-page-title flex items-center gap-2">
          <Clock className="h-7 w-7 text-teal-600" /> WorkDone reports
        </h1>
        <p className="tff-page-subtitle">Time logged across the firm. Filter by date range using URL params <code>?from=YYYY-MM-DD&amp;to=YYYY-MM-DD</code>.</p>
      </div>

      <form className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4" method="get">
        <label className="text-sm">
          From <input name="from" type="date" defaultValue={fromIso} className="ml-2 rounded border border-zinc-200 px-2 py-1 text-sm" />
        </label>
        <label className="text-sm">
          To <input name="to" type="date" defaultValue={toIso} className="ml-2 rounded border border-zinc-200 px-2 py-1 text-sm" />
        </label>
        <button type="submit" className="rounded bg-zinc-900 text-white text-sm px-3 py-1.5">Apply</button>
      </form>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total time" value={fmtHM(totalMinutes)} />
        <Stat label="Team members logging" value={Object.keys(byUser).length.toString()} />
        <Stat label="Clients with activity" value={Object.keys(byClient).length.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold">By team member</h2>
          </div>
          {Object.values(byUser).length === 0 ? (
            <div className="p-8 text-sm text-zinc-500 text-center">No time logged in this range.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.values(byUser).sort((a, b) => b.minutes - a.minutes).map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtHM(u.minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold">By client</h2>
          </div>
          {Object.values(byClient).length === 0 ? (
            <div className="p-8 text-sm text-zinc-500 text-center">No time logged in this range.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.values(byClient).sort((a, b) => b.minutes - a.minutes).map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtHM(c.minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold">Cross-tab (member × client)</h2>
        </div>
        {summary.length === 0 ? (
          <div className="p-8 text-sm text-zinc-500 text-center">No time logged in this range.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {summary.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.user_name}</TableCell>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtHM(r.total_minutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

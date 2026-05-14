import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function ImportBatchDetail({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: batch } = await sb
    .from('client_import_batches')
    .select(
      'id, source_filename, total_rows, successful_rows, skipped_rows, error_rows, errors, status, uploaded_at, users_profile:uploaded_by(full_name, email)',
    )
    .eq('id', params.id)
    .maybeSingle();
  if (!batch) notFound();
  const errors = (batch as any).errors ?? [];
  return (
    <div className="space-y-8 max-w-5xl">
      <Link
        href="/admin/clients/import"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> Imports
      </Link>
      <div>
        <h1 className="tff-page-title">
          {(batch as any).source_filename ?? 'Import batch'}
        </h1>
        <div className="flex flex-wrap gap-2 items-center mt-2 text-sm text-zinc-500">
          <span>{formatDateIST((batch as any).uploaded_at)}</span>
          <span>·</span>
          <span>by {(batch as any).users_profile?.full_name ?? '—'}</span>
          <Badge variant={(batch as any).status === 'completed' ? 'success' : 'outline'}>
            {(batch as any).status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total rows', value: (batch as any).total_rows },
          { label: 'Inserted', value: (batch as any).successful_rows },
          { label: 'Skipped', value: (batch as any).skipped_rows },
          { label: 'Failed', value: (batch as any).error_rows },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-500">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Errors / skipped</h2>
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-zinc-50/50">
                  <TableHead>Row</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((e: any, i: number) => (
                  <TableRow key={i} data-row>
                    <TableCell className="text-zinc-400">{e.row_index}</TableCell>
                    <TableCell>{e.business_name}</TableCell>
                    <TableCell className="text-amber-700 text-xs">{e.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

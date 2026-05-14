import ClientImportForm from './import-form';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDateIST } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Upload } from 'lucide-react';
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

async function getRecentBatches() {
  const sb = createClient();
  const { data } = await sb
    .from('client_import_batches')
    .select(
      'id, source_filename, total_rows, successful_rows, skipped_rows, error_rows, status, uploaded_at, users_profile:uploaded_by(full_name)',
    )
    .order('uploaded_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

export default async function ClientImportPage() {
  const batches = await getRecentBatches();
  return (
    <div className="space-y-12">
      <ClientImportForm />

      <div className="max-w-5xl">
        <h2 className="text-lg font-semibold mb-4">Recent imports</h2>
        {batches.length === 0 ? (
          <EmptyState
            title="No imports yet"
            body="Upload a CSV or Excel file to import clients in bulk."
            icon={<Upload className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-zinc-50/50">
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Inserted</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b: any) => (
                  <TableRow key={b.id} data-row>
                    <TableCell className="text-zinc-500">{formatDateIST(b.uploaded_at)}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/admin/clients/import/${b.id}`} className="hover:underline">
                        {b.source_filename ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {b.users_profile?.full_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{b.successful_rows}</TableCell>
                    <TableCell className="text-right">{b.skipped_rows}</TableCell>
                    <TableCell className="text-right">{b.error_rows}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'completed' ? 'success' : 'outline'}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

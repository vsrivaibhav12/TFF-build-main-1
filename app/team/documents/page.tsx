import { listDocuments } from '@/lib/repositories/documents';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DocumentUpload from './document-upload';
import DocumentVisibilityToggle from './document-visibility-toggle';
import { formatDateIST } from '@/lib/utils';
import { Download, FileText } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function TeamDocumentsPage() {
  const [docs, clients] = await Promise.all([listDocuments(), listAccessibleClients()]);
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="tff-page-title">Documents</h1>
          <p className="tff-page-subtitle">Firm-wide document register. Toggle client visibility per file.</p>
        </div>
        <DocumentUpload clients={clients as any}><Button data-testid="doc-upload">Upload</Button></DocumentUpload>
      </div>
      {docs.length === 0 ? (
        <EmptyState
          title="No documents yet"
          body="Upload the first file to start the document register."
          icon={<FileText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead><TableHead>Client</TableHead>
                <TableHead>Category</TableHead><TableHead>Period</TableHead>
                <TableHead>Uploaded</TableHead><TableHead>Visible to client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d: any) => (
                <TableRow key={d.id} data-testid={`doc-row-${d.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <Link href={d.file_url} target="_blank" className="font-medium hover:underline">{d.file_name}</Link>
                    </div>
                    {d.description && <div className="text-xs text-zinc-500 mt-1">{d.description}</div>}
                  </TableCell>
                  <TableCell>{d.clients?.business_name}</TableCell>
                  <TableCell><Badge variant="outline">{d.document_category ?? '—'}</Badge></TableCell>
                  <TableCell>{d.document_period_month ?? '—'}/{d.document_period_year ?? '—'}</TableCell>
                  <TableCell><div className="text-xs">{formatDateIST(d.created_at)}</div><div className="text-xs text-zinc-500">by {d.users_profile?.full_name ?? '—'}</div></TableCell>
                  <TableCell><DocumentVisibilityToggle id={d.id} initial={!!d.visible_to_client} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

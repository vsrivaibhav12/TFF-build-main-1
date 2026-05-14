'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { FileText, Download, Eye, Building2, Search, FileX } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

interface DocumentRow {
  id: string;
  file_name: string;
  file_url: string | null;
  document_category: string | null;
  created_at: string;
  clients: { business_name: string } | null;
}

export default function DocumentsTableClient({ documents }: { documents: DocumentRow[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (d) =>
        d.file_name.toLowerCase().includes(term) ||
        d.document_category?.toLowerCase().includes(term) ||
        d.clients?.business_name?.toLowerCase().includes(term)
    );
  }, [documents, q]);

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search documents…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={q ? 'No matching documents' : 'No documents yet'}
          body={
            q
              ? 'Try a different search term.'
              : 'Documents will appear here once uploaded to the repository.'
          }
          icon={<FileX className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-zinc-50/50">
                <TableHead>Document &amp; client</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} data-row>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-zinc-100 text-zinc-500">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900">{d.file_name}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{d.clients?.business_name ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.document_category || 'unclassified'}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-700 tabular-nums">
                    {formatDateIST(d.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        aria-label="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {d.file_url && (
                        <a
                          href={d.file_url}
                          download
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

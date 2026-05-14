import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { FileText, Download, Eye, Building2, Search, FileX } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Suspense } from 'react';
import DocumentsTableClient from './documents-table-client';

export const dynamic = 'force-dynamic';

interface DocumentRow {
  id: string;
  file_name: string;
  file_url: string | null;
  document_category: string | null;
  created_at: string;
  clients: { business_name: string } | null;
}

async function DocumentsData() {
  const sb = createClient();
  const { data: documents } = await sb
    .from('documents')
    .select('id, file_name, file_url, document_category, created_at, clients(business_name)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(100);

  return <DocumentsTableClient documents={(documents ?? []) as unknown as DocumentRow[]} />;
}

export default async function AdminDocumentsPage() {
  await requireRole('admin');

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Documents</h1>
          <p className="tff-page-subtitle">Centralized archive of statutory filings and client records.</p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden animate-pulse">
            <div className="h-10 bg-zinc-100" />
            <div className="h-12 bg-zinc-50 border-t border-zinc-100" />
            <div className="h-12 bg-white border-t border-zinc-100" />
            <div className="h-12 bg-zinc-50 border-t border-zinc-100" />
          </div>
        }
      >
        <DocumentsData />
      </Suspense>
    </div>
  );
}

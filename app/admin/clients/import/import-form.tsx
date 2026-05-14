'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import {
  previewClientImportAction,
  previewGstnPasteAction,
  commitClientImportAction,
  type ImportPreview,
} from '@/lib/actions/client-import';

type Mode = 'file' | 'paste';

export default function ClientImportPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('file');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pending, startTransition] = useTransition();

  function onUploadPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await previewClientImportAction(fd);
      if (!r.success) { toast.error(r.error); return; }
      setPreview(r.data);
      toast.success(`Parsed ${r.data.summary.total} row${r.data.summary.total === 1 ? '' : 's'}`);
    });
  }

  function onPastePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const r = await previewGstnPasteAction({ text: pasteText });
      if (!r.success) { toast.error(r.error); return; }
      setPreview(r.data);
      toast.success(`Parsed ${r.data.summary.total} GSTIN${r.data.summary.total === 1 ? '' : 's'}`);
    });
  }

  /** Inline edit for the paste-preview rows. */
  function patchRow(rowIndex: number, patch: Record<string, string>) {
    if (!preview) return;
    const next = { ...preview, rows: preview.rows.map((r) => {
      if (r.row_index !== rowIndex) return r;
      const updated: any = { ...r, ...patch };
      // Re-validate inline-editable fields:
      const errs = (r.errors ?? []).filter((e) =>
        !e.startsWith('Business name required') &&
        !e.startsWith('invalid email')
      );
      if (!updated.business_name) errs.push('Business name required — fill in before importing');
      if (updated.primary_contact_email && !/^\S+@\S+\.\S+$/.test(updated.primary_contact_email)) {
        errs.push(`invalid email: ${updated.primary_contact_email}`);
      }
      updated.errors = errs;
      return updated;
    }) };
    const summary = {
      total: next.rows.length,
      error: next.rows.filter((r) => r.errors.length > 0).length,
      ready: next.rows.filter((r) => r.errors.length === 0).length,
    };
    setPreview({ ...next, summary });
  }

  function commit() {
    if (!preview) return;
    const ready = preview.rows.filter((r) => r.errors.length === 0);
    if (ready.length === 0) { toast.error('No valid rows to import'); return; }
    startTransition(async () => {
      const r = await commitClientImportAction({
        file_name: preview.fileName,
        rows: preview.rows,
      });
      if (!r.success) { toast.error(r.error); return; }
      toast.success(
        `Imported ${(r as any).data.inserted} client${(r as any).data.inserted === 1 ? '' : 's'} · skipped ${(r as any).data.skipped} · failed ${(r as any).data.failed}`,
      );
      setPreview(null);
      setPasteText('');
      router.push('/admin/clients');
    });
  }

  const isPasteMode = preview?.source === 'gstn_paste' || mode === 'paste';

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Clients
      </Link>

      <div>
        <h1 className="tff-page-title">Bulk import clients</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Two ways to add clients in bulk: upload a CSV / Excel file, or paste a list
          of GSTINs and we&apos;ll derive state and PAN automatically.
        </p>
      </div>

      {/* Mode switcher */}
      {!preview && (
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 ${mode === 'file' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            data-testid="import-mode-file"
          >
            <FileSpreadsheet className="h-4 w-4" /> Upload file
          </button>
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 ${mode === 'paste' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            data-testid="import-mode-paste"
          >
            <ClipboardList className="h-4 w-4" /> Paste GSTINs
          </button>
        </div>
      )}

      {/* File-upload form */}
      {!preview && mode === 'file' && (
        <div className="rounded-xl border border-zinc-200 p-6 bg-white space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-teal-600 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium">Expected columns (any order, case-insensitive):</p>
              <code className="block rounded bg-zinc-50 border border-zinc-200 p-3 text-xs leading-relaxed">
                business_name <span className="text-zinc-400">(required)</span>, pan, gstin, category,
                industry, primary_contact_person, primary_contact_email,
                primary_contact_phone, city, state, pincode
              </code>
              <p className="text-zinc-500 text-xs">
                <strong>category</strong> must be one of: sole_proprietor, partnership, llp,
                pvt_ltd, public_ltd, huf, aop, ngo, other.
              </p>
            </div>
          </div>
          <form onSubmit={onUploadPreview} className="flex items-center gap-3 pt-2">
            <Input type="file" name="file" accept=".csv,.xlsx,.xls" required className="max-w-md" data-testid="import-file-input" />
            <Button type="submit" disabled={pending} data-testid="import-preview-btn">
              <Upload className="h-4 w-4 mr-1" /> Preview
            </Button>
          </form>
        </div>
      )}

      {/* GSTN paste form */}
      {!preview && mode === 'paste' && (
        <div className="rounded-xl border border-zinc-200 p-6 bg-white space-y-4">
          <div className="flex items-start gap-3">
            <ClipboardList className="h-5 w-5 text-teal-600 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium">Paste one GSTIN per line.</p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                We&apos;ll validate the 15-char format, derive PAN from positions 3–12,
                and look up the state from the first 2 digits. You fill in business
                name and contact details in the preview table before importing.
                Maximum 200 GSTINs per paste.
              </p>
              <code className="block rounded bg-zinc-50 border border-zinc-200 p-2 text-xs leading-relaxed text-zinc-500">
                33ABCDE1234F1Z5<br />
                27FGHIJ5678K2Z9<br />
                07LMNOP9012Q3Z4
              </code>
            </div>
          </div>
          <form onSubmit={onPastePreview} className="space-y-3 pt-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste GSTINs here, one per line…"
              rows={8}
              required
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
              data-testid="gstn-paste-input"
            />
            <Button type="submit" disabled={pending || !pasteText.trim()} data-testid="gstn-paste-preview-btn">
              <Upload className="h-4 w-4 mr-1" /> Preview
            </Button>
          </form>
        </div>
      )}

      {/* Preview / commit */}
      {preview && (
        <div className="space-y-4" data-testid="import-preview">
          <div className="rounded-xl border border-zinc-200 p-6 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{preview.fileName}</h3>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {preview.summary.ready} ready
                </Badge>
                {preview.summary.error > 0 && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {preview.summary.error} with errors
                  </Badge>
                )}
                <span className="text-sm text-zinc-500">{preview.summary.total} total</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={commit} disabled={pending || preview.summary.ready === 0} data-testid="import-commit-btn">
                  {pending ? 'Importing…' : `Import ${preview.summary.ready} client${preview.summary.ready === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
            {isPasteMode && (
              <p className="text-xs text-zinc-500 mt-3">
                Tip: fill in <strong>Business name</strong> for each row — it&apos;s required.
                Email and phone are optional. State and PAN were auto-derived from the GSTIN.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-zinc-50 sticky top-0">
                  <TableRow className="text-left text-zinc-500 hover:bg-zinc-50">
                    <TableHead className="px-3 py-2 font-medium">Row</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Business name {isPasteMode && <span className="text-red-500">*</span>}</TableHead>
                    <TableHead className="px-3 py-2 font-medium">PAN</TableHead>
                    <TableHead className="px-3 py-2 font-medium">GSTIN</TableHead>
                    <TableHead className="px-3 py-2 font-medium">State</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Email</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Phone</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r: any) => {
                    const hasErr = r.errors.length > 0;
                    return (
                      <TableRow key={r.row_index} className={hasErr ? 'bg-amber-50/40' : ''} data-testid={`import-row-${r.row_index}`}>
                        <TableCell className="px-3 py-2 text-zinc-400 align-top">{r.row_index}</TableCell>
                        <TableCell className="px-3 py-2 align-top">
                          {isPasteMode ? (
                            <Input
                              value={r.business_name ?? ''}
                              onChange={(e) => patchRow(r.row_index, { business_name: e.target.value })}
                              placeholder="Required"
                              className="h-8 text-sm w-48"
                            />
                          ) : (
                            <span className="font-medium">{r.business_name || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top font-mono text-xs">{r.pan ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top font-mono text-xs">{r.gstin ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top">{r.state ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2 align-top">
                          {isPasteMode ? (
                            <Input
                              value={r.primary_contact_email ?? ''}
                              onChange={(e) => patchRow(r.row_index, { primary_contact_email: e.target.value })}
                              placeholder="optional"
                              className="h-8 text-sm w-48"
                            />
                          ) : (
                            <span className="text-zinc-600">{r.primary_contact_email ?? '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2 align-top">
                          {isPasteMode ? (
                            <Input
                              value={r.primary_contact_phone ?? ''}
                              onChange={(e) => patchRow(r.row_index, { primary_contact_phone: e.target.value })}
                              placeholder="optional"
                              className="h-8 text-sm w-36"
                            />
                          ) : (
                            <span className="text-zinc-600">{r.primary_contact_phone ?? '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2 align-top">
                          {hasErr ? (
                            <span className="text-xs text-amber-700">{r.errors.join('; ')}</span>
                          ) : (
                            <Badge variant="success" className="text-[10px]">ready</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

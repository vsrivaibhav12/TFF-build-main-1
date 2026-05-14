'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { parseClientsBuffer, type ParsedClientRow } from '@/lib/services/client-import-service';
import { parseGstnPasteText } from '@/lib/services/gstn-paste-service';

export interface ImportPreview {
  rows: ParsedClientRow[];
  summary: { total: number; ready: number; error: number };
  fileName: string;
  source?: 'file' | 'gstn_paste';
}

/**
 * Parse the uploaded file (CSV or XLSX) on the server and return a preview.
 * No DB writes happen on preview — only validation.
 */
export async function previewClientImportAction(formData: FormData): Promise<ActionResult<ImportPreview>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.create');
    const file = formData.get('file');
    if (!(file instanceof File)) return fail('No file provided', 'VALIDATION');
    if (file.size === 0) return fail('Empty file', 'VALIDATION');
    if (file.size > 5 * 1024 * 1024) return fail('File exceeds 5 MB limit', 'VALIDATION');

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const rows = parseClientsBuffer(buf, file.name);
    if (rows.length === 0) return fail('No data rows found in the file', 'EMPTY');

    const summary = {
      total: rows.length,
      error: rows.filter((r) => r.errors.length > 0).length,
      ready: rows.length - rows.filter((r) => r.errors.length > 0).length,
    };
    return ok({ rows, summary, fileName: file.name, source: 'file' });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Preview a multiline-paste of GSTINs (no paid API; pure regex + state-code lookup).
 * Each line becomes a row pre-filled with GSTIN, derived PAN (positions 3-12), and
 * state name. Caller fills in business_name and contact details inline before commit.
 */
export async function previewGstnPasteAction(input: {
  text: string;
}): Promise<ActionResult<ImportPreview>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.create');
    if (!input?.text || typeof input.text !== 'string') return fail('No GSTINs provided', 'VALIDATION');
    const rows = parseGstnPasteText(input.text);
    if (rows.length === 0) return fail('No GSTINs found in input', 'EMPTY');
    if (rows.length > 200) return fail('Maximum 200 GSTINs per paste — split into smaller batches', 'VALIDATION');

    // Flag each row that lacks a business_name (it's required to commit).
    for (const r of rows) {
      if (!r.business_name) r.errors.push('Business name required — fill in before importing');
    }
    const summary = {
      total: rows.length,
      error: rows.filter((r) => r.errors.length > 0).length,
      ready: rows.filter((r) => r.errors.length === 0).length,
    };
    return ok({ rows, summary, fileName: `GSTN paste (${rows.length} rows)`, source: 'gstn_paste' });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Commit the import: insert valid rows into `clients` and write an audit
 * batch record to `client_import_batches` (per v3.2 spec). Insert-only;
 * skips duplicates by PAN/GSTIN if those already exist.
 */
export async function commitClientImportAction(input: {
  file_name: string;
  rows: ParsedClientRow[];
}): Promise<ActionResult<{ batch_id: string; inserted: number; skipped: number; failed: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.create');
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      return fail('No rows to import', 'VALIDATION');
    }
    const sb = createClient();

    // Pre-load existing PAN/GSTIN to skip duplicates server-side
    const pans = input.rows.map((r) => r.pan).filter(Boolean) as string[];
    const gstins = input.rows.map((r) => r.gstin).filter(Boolean) as string[];
    const existingPans = new Set<string>();
    const existingGstins = new Set<string>();
    if (pans.length > 0) {
      const { data } = await sb.from('clients').select('pan').in('pan', pans);
      (data ?? []).forEach((r: any) => r.pan && existingPans.add(r.pan));
    }
    if (gstins.length > 0) {
      const { data } = await sb.from('clients').select('gstin').in('gstin', gstins);
      (data ?? []).forEach((r: any) => r.gstin && existingGstins.add(r.gstin));
    }

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const errorEntries: Array<{ row_index: number; business_name: string; error: string }> = [];

    for (const r of input.rows) {
      if (r.errors.length > 0) {
        failed++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name || '(no name)',
          error: r.errors.join('; '),
        });
        continue;
      }
      if (r.pan && existingPans.has(r.pan)) {
        skipped++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name,
          error: `Duplicate PAN ${r.pan} — skipped`,
        });
        continue;
      }
      if (r.gstin && existingGstins.has(r.gstin)) {
        skipped++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name,
          error: `Duplicate GSTIN ${r.gstin} — skipped`,
        });
        continue;
      }

      const insertRow: Record<string, any> = {
        business_name: r.business_name,
        pan: r.pan ?? null,
        gstin: r.gstin ?? null,
        category: r.category ?? null,
        industry: r.industry ?? null,
        primary_contact_person: r.primary_contact_person ?? null,
        primary_contact_email: r.primary_contact_email ?? null,
        primary_contact_phone: r.primary_contact_phone ?? null,
        city: r.city ?? null,
        state: r.state ?? null,
        pincode: r.pincode ?? null,
      };
      const { error } = await sb.from('clients').insert(insertRow);
      if (error) {
        failed++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name,
          error: error.message,
        });
      } else {
        inserted++;
        if (r.pan) existingPans.add(r.pan);
        if (r.gstin) existingGstins.add(r.gstin);
      }
    }

    const { data: batch, error: batchErr } = await sb
      .from('client_import_batches')
      .insert({
        uploaded_by: me.id,
        source_filename: input.file_name,
        total_rows: input.rows.length,
        successful_rows: inserted,
        skipped_rows: skipped,
        error_rows: failed,
        errors: errorEntries,
        status: 'completed',
      })
      .select('id')
      .single();
    if (batchErr) return fail(`Batch audit failed: ${batchErr.message}`, 'DB');

    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/import');
    return ok({ batch_id: batch.id, inserted, skipped, failed });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { recordDocumentMetaAction } from '@/lib/actions/documents';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const CATEGORIES = ['GST', 'Income_Tax', 'TDS', 'ROC', 'Bank_Statement', 'Ledger', 'Register', 'Payroll', 'Insurance', 'Audit', 'Legal', 'Other'];

export default function DocumentUpload({ clients, children }: { clients: { id: string; business_name: string }[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({
    client_id: '',
    document_category: 'Other',
    document_period_month: undefined as number | undefined,
    document_period_year: undefined as number | undefined,
    description: '',
    visible_to_client: false,
  });

  async function upload() {
    if (!file) { toast.error('Choose a file'); return; }
    if (!meta.client_id) { toast.error('Choose client'); return; }
    const sb = createClient();
    const path = `${meta.client_id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error: upErr } = await sb.storage.from('documents').upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = sb.storage.from('documents').getPublicUrl(path);
    startTransition(async () => {
      const r = await recordDocumentMetaAction({
        client_id: meta.client_id,
        file_name: file.name,
        file_url: pub.publicUrl,
        file_size: file.size,
        file_type: file.type,
        document_category: meta.document_category,
        document_period_month: meta.document_period_month,
        document_period_year: meta.document_period_year,
        description: meta.description,
        visible_to_client: meta.visible_to_client,
      });
      if (r.success) { toast.success('Uploaded'); setOpen(false); setFile(null); }
      else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Client *</Label>
            <Select value={meta.client_id} onValueChange={(v) => setMeta({ ...meta, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>File *</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="doc-file" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Category</Label>
              <Select value={meta.document_category} onValueChange={(v) => setMeta({ ...meta, document_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-2 flex-1"><Label>Month</Label><Input type="number" min={1} max={12} value={meta.document_period_month ?? ''} onChange={(e) => setMeta({ ...meta, document_period_month: e.target.value ? Number(e.target.value) : undefined })} /></div>
              <div className="space-y-2 flex-1"><Label>Year</Label><Input type="number" min={2000} max={2100} value={meta.document_period_year ?? ''} onChange={(e) => setMeta({ ...meta, document_period_year: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
          <div className="flex items-center justify-between">
            <div><Label>Visible to client</Label><p className="text-xs text-zinc-500">Show in client portal.</p></div>
            <Switch checked={meta.visible_to_client} onCheckedChange={(v) => setMeta({ ...meta, visible_to_client: !!v })} data-testid="doc-visible" />
          </div>
        </div>
        <DialogFooter><Button onClick={upload} disabled={pending} data-testid="doc-save">{pending ? 'Uploading…' : 'Upload'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

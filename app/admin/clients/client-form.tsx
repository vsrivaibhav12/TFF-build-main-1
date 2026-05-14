'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { createClient, updateClient } from '@/lib/actions/clients';
import { Loader2 } from 'lucide-react';

interface ClientFormProps {
  groups: { id: string; name: string }[];
  owners: { id: string; full_name: string; email: string }[];
  initial?: any;
}

export default function ClientForm({ groups, owners, initial }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: initial?.business_name ?? '',
    pan: initial?.pan ?? '',
    gstin: initial?.gstin ?? '',
    category: initial?.category ?? '',
    industry: initial?.industry ?? '',
    primary_contact_person: initial?.primary_contact_person ?? '',
    primary_contact_email: initial?.primary_contact_email ?? '',
    primary_contact_phone: initial?.primary_contact_phone ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    pincode: initial?.pincode ?? '',
    lifecycle_stage: initial?.lifecycle_stage ?? 'lead',
    group_id: initial?.group_id ?? '',
    primary_owner_id: initial?.primary_owner_id ?? '',
    portal_enabled: !!initial?.portal_enabled,
    notes: initial?.notes ?? '',
  });

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: any = { ...form };
    if (!payload.group_id) payload.group_id = null;
    if (!payload.primary_owner_id) payload.primary_owner_id = null;
    if (!payload.category) payload.category = null;
    const result = isEdit
      ? await updateClient({ id: initial.id, ...payload })
      : await createClient(payload);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? 'Client updated' : 'Client created');
    router.push(isEdit ? `/admin/clients/${initial.id}` : `/admin/clients/${(result as any).data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" data-testid="client-form">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Business</h3>
        <div className="space-y-2"><Label htmlFor="bn">Business name *</Label><Input id="bn" required value={form.business_name} onChange={(e) => set('business_name', e.target.value)} data-testid="client-business-name" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>PAN</Label><Input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} /></div>
          <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="33ABCDE1234F1Z5" maxLength={15} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {['sole_proprietor', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'huf', 'aop', 'ngo', 'other'].map(c => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={(e) => set('industry', e.target.value)} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Primary contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Contact person</Label><Input value={form.primary_contact_person} onChange={(e) => set('primary_contact_person', e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.primary_contact_phone} onChange={(e) => set('primary_contact_phone', e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.primary_contact_email} onChange={(e) => set('primary_contact_email', e.target.value)} data-testid="client-email" /></div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Engagement</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Lifecycle stage</Label>
            <Select value={form.lifecycle_stage} onValueChange={(v) => set('lifecycle_stage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['lead', 'caas_only', 'caas_bizlens', 'caas_vcfo', 'caas_bizlens_vcfo', 'full_suite', 'churn'].map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Group</Label>
            <Select value={form.group_id} onValueChange={(v) => set('group_id', v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Primary owner</Label>
            <Select value={form.primary_owner_id} onValueChange={(v) => set('primary_owner_id', v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.full_name} ({o.email})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="pe" type="checkbox" className="h-4 w-4 accent-teal-600" checked={form.portal_enabled} onChange={(e) => set('portal_enabled', e.target.checked)} />
          <Label htmlFor="pe" className="font-normal">Enable client portal access</Label>
        </div>
        <div className="space-y-2"><Label>Internal notes</Label><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} /></div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} data-testid="client-submit">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isEdit ? 'Save changes' : 'Create client'}
        </Button>
      </div>
    </form>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Pencil, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  upsertBillingEntityAction,
  setBillingEntityAccessAction,
} from '@/lib/actions/billing-org';

interface Entity {
  id: string;
  name: string;
  legal_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  invoice_prefix: string;
  default_profit_centre_code?: string | null;
  signing_authority_name?: string | null;
  city?: string | null;
  state?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  is_active: boolean;
}

interface PC {
  code: string;
  name: string;
}

interface Staff {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Access {
  user_id: string;
  billing_entity_id: string;
}

export default function BillingEntitiesAdmin({
  entities,
  profitCentres,
  staff,
  access,
}: {
  entities: Entity[];
  profitCentres: PC[];
  staff: Staff[];
  access: Access[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Entity | 'new' | null>(null);
  const [accessFor, setAccessFor] = useState<Entity | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setEditing('new')} data-testid="new-billing-entity">
          <Plus className="h-4 w-4" /> New billing entity
        </Button>
      </div>

      {entities.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
          <Building2 className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">
            No billing entities yet. Add one to start tagging tasks and invoices.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.map((e) => {
            const accessUsers = access.filter((a) => a.billing_entity_id === e.id);
            return (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
                data-testid={`be-card-${e.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-600" />
                      {e.name}
                    </div>
                    {e.legal_name && (
                      <div className="text-sm text-zinc-500">{e.legal_name}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setAccessFor(e)} title="Manage access">
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(e)} data-testid={`be-edit-${e.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {e.gstin && <div><span className="text-zinc-400">GSTIN:</span> <code className="font-mono">{e.gstin}</code></div>}
                  {e.pan && <div><span className="text-zinc-400">PAN:</span> <code className="font-mono">{e.pan}</code></div>}
                  <div><span className="text-zinc-400">Invoice prefix:</span> <code className="font-mono">{e.invoice_prefix}</code></div>
                  {e.default_profit_centre_code && (
                    <div><span className="text-zinc-400">Default PC:</span> <code className="font-mono">{e.default_profit_centre_code}</code></div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100">
                  <span>{accessUsers.length} staff</span>
                  {!e.is_active && <Badge variant="outline">inactive</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EntityDialog
          entity={editing === 'new' ? null : editing}
          profitCentres={profitCentres}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {accessFor && (
        <AccessDialog
          entity={accessFor}
          staff={staff}
          access={access.filter((a) => a.billing_entity_id === accessFor.id)}
          onClose={() => setAccessFor(null)}
          onSaved={() => {
            setAccessFor(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EntityDialog({
  entity,
  profitCentres,
  onClose,
  onSaved,
}: {
  entity: Entity | null;
  profitCentres: PC[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    id: entity?.id,
    name: entity?.name ?? '',
    legal_name: entity?.legal_name ?? '',
    gstin: entity?.gstin ?? '',
    pan: entity?.pan ?? '',
    invoice_prefix: entity?.invoice_prefix ?? '',
    default_profit_centre_code: entity?.default_profit_centre_code ?? '',
    signing_authority_name: entity?.signing_authority_name ?? '',
    city: entity?.city ?? '',
    state: entity?.state ?? '',
    bank_account_number: entity?.bank_account_number ?? '',
    bank_ifsc: entity?.bank_ifsc ?? '',
    is_active: entity?.is_active ?? true,
  });
  const [pending, startTransition] = useTransition();
  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }
  function save() {
    if (!f.name.trim() || !f.invoice_prefix.trim()) {
      toast.error('Name and invoice prefix are required');
      return;
    }
    startTransition(async () => {
      const r = await upsertBillingEntityAction({
        ...f,
        default_profit_centre_code: f.default_profit_centre_code || null,
      } as any);
      if (!r.success) toast.error(r.error);
      else {
        toast.success(entity ? 'Saved' : 'Billing entity created');
        onSaved();
      }
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entity ? 'Edit billing entity' : 'New billing entity'}</DialogTitle>
          <DialogDescription>Tax and bank details that print on invoices.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Display name *</Label>
              <Input value={f.name} onChange={(e) => set('name', e.target.value)} data-testid="be-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Legal name</Label>
              <Input value={f.legal_name} onChange={(e) => set('legal_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input value={f.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice prefix *</Label>
              <Input value={f.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} placeholder="TFF/2025-26/" data-testid="be-prefix" />
            </div>
            <div className="space-y-1.5">
              <Label>Default profit centre</Label>
              <select
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                value={f.default_profit_centre_code}
                onChange={(e) => set('default_profit_centre_code', e.target.value)}
              >
                <option value="">None</option>
                {profitCentres.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={f.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={f.state} onChange={(e) => set('state', e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Signing authority</Label>
              <Input value={f.signing_authority_name} onChange={(e) => set('signing_authority_name', e.target.value)} placeholder="CA Vamshi …" />
            </div>
            <div className="space-y-1.5">
              <Label>Bank account number</Label>
              <Input value={f.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC</Label>
              <Input value={f.bank_ifsc} onChange={(e) => set('bank_ifsc', e.target.value.toUpperCase())} className="font-mono" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={save} disabled={pending} data-testid="be-save">
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessDialog({
  entity,
  staff,
  access,
  onClose,
  onSaved,
}: {
  entity: Entity;
  staff: Staff[];
  access: Access[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(access.map((a) => a.user_id)));
  const [pending, startTransition] = useTransition();
  function toggle(uid: string) {
    const next = new Set(selected);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    setSelected(next);
  }
  function save() {
    startTransition(async () => {
      // For each selected user, set their access list. Simpler: bulk per-user calls
      // Note: action replaces *all* entity access for that user with the entity_ids passed.
      // That's wrong here because we only want to add/remove THIS entity for selected users.
      // To keep semantics correct, we toggle one-by-one:
      // First fetch current per-user access and adjust this entity in/out.
      // For simplicity, we POST all selected users with the union of their existing entities ± this one.
      // Easier: backend receives one user_id + full list — so client sends per-user calls only for diffs.
      const orig = new Set(access.map((a) => a.user_id));
      const toAdd: string[] = [...selected].filter((u) => !orig.has(u));
      const toRemove: string[] = [...orig].filter((u) => !selected.has(u));
      for (const uid of [...toAdd, ...toRemove]) {
        // Re-derive per-user list from input we have:
        const userOtherEntities = access
          .filter((a) => a.user_id === uid && a.billing_entity_id !== entity.id)
          .map((a) => a.billing_entity_id);
        const finalList = selected.has(uid)
          ? [...userOtherEntities, entity.id]
          : userOtherEntities;
        const r = await setBillingEntityAccessAction({ user_id: uid, billing_entity_ids: finalList });
        if (!r.success) {
          toast.error(`Failed for one user: ${r.error}`);
          return;
        }
      }
      toast.success('Access updated');
      onSaved();
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Access · {entity.name}</DialogTitle>
          <DialogDescription>Pick the staff members who can act under this billing entity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {staff.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-zinc-50 cursor-pointer"
            >
              <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.full_name}</div>
                <div className="text-xs text-zinc-500">{s.email}</div>
              </div>
              <Badge variant={s.role === 'admin' ? 'teal' : 'outline'} className="text-[10px]">
                {s.role}
              </Badge>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={save} disabled={pending} data-testid="be-access-save">
            {pending ? 'Saving…' : 'Save access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

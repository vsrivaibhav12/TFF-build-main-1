'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ALL_CAPABILITIES } from '@/lib/auth/capabilities';
import {
  upsertRoleTemplateAction,
  deleteRoleTemplateAction,
} from '@/lib/actions/role-templates';
import EmptyState from '@/components/sophistication/empty-state';
import type { RoleTemplate } from '@/lib/repositories/role-templates';

// Group capabilities into logical clusters for UX (don't expose raw list to user)
const CLUSTERS: Array<{ label: string; caps: readonly string[] }> = [
  { label: 'Clients', caps: ['clients.read.all', 'clients.create', 'clients.edit', 'clients.delete', 'clients.assign_team', 'clients.toggle_portal'] },
  { label: 'Services', caps: ['services.manage', 'services.assign'] },
  { label: 'Staff', caps: ['staff.manage', 'staff.grant_capabilities'] },
  { label: 'Vaults', caps: ['dsc.manage', 'credentials.manage', 'documents.upload', 'documents.delete'] },
  { label: 'Tasks & Compliance', caps: ['tasks.assign', 'tasks.complete', 'compliance.enter', 'notices.manage', 'queries.assign'] },
  { label: 'Advisory', caps: ['bizlens.enter', 'vcfo.enter', 'insights.configure'] },
  { label: 'HR & Payroll', caps: ['payroll.run', 'attendance.approve', 'leave.approve'] },
  { label: 'Insights & Audit', caps: ['audit.view', 'firm_dashboard.view'] },
];

export default function RoleTemplatesAdmin({ templates }: { templates: RoleTemplate[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoleTemplate | 'new' | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing('new');
  }
  function openEdit(t: RoleTemplate) {
    setEditing(t);
  }

  function remove(id: string) {
    if (!confirm('Delete this role template? Staff with this role keep their current capabilities.')) return;
    startTransition(async () => {
      const r = await deleteRoleTemplateAction(id);
      if (!r.success) toast.error(r.error);
      else {
        toast.success('Role template removed');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="tff-page-title">Staff role templates</h1>
          <p className="tff-page-subtitle">
            Group capabilities into roles like &ldquo;Senior Tax Associate&rdquo; or
            &ldquo;Articleship&rdquo;. Apply a role to bulk-grant the right
            access &mdash; no checkbox grids in front of users.
          </p>
        </div>
        <Button onClick={openNew} data-testid="new-role-btn">
          <Plus className="h-4 w-4" /> New role
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="No role templates yet"
          body="Create your first role &mdash; e.g. Senior Tax Associate &mdash; with the access an articled clerk should have."
          actionLabel="Create role"
          actionOnClick={openNew}
          icon={<ShieldCheck className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
              data-testid={`role-card-${t.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    {t.name}
                  </div>
                  {t.description && (
                    <p className="text-sm text-zinc-600 mt-1">{t.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`role-edit-${t.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(t.id)}
                    disabled={pending}
                    data-testid={`role-delete-${t.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {t.staff_count} staff
                </span>
                <span>·</span>
                <span>{t.capabilities.length} capabilities</span>
              </div>

              {t.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.capabilities.slice(0, 6).map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] font-mono">
                      {c}
                    </Badge>
                  ))}
                  {t.capabilities.length > 6 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{t.capabilities.length - 6}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RoleEditorDialog
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RoleEditorDialog({
  template,
  onClose,
  onSaved,
}: {
  template: RoleTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [caps, setCaps] = useState<Set<string>>(new Set(template?.capabilities ?? []));
  const [pending, startTransition] = useTransition();

  function toggleCluster(clusterCaps: readonly string[]) {
    const next = new Set(caps);
    const allSelected = clusterCaps.every((c) => next.has(c));
    for (const c of clusterCaps) {
      if (allSelected) next.delete(c);
      else next.add(c);
    }
    setCaps(next);
  }
  function toggleCap(c: string) {
    const next = new Set(caps);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setCaps(next);
  }

  function save() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    startTransition(async () => {
      const r = await upsertRoleTemplateAction({
        id: template?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        capabilities: [...caps] as any,
      });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(template ? 'Role updated' : 'Role created');
        onSaved();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit role template' : 'New role template'}</DialogTitle>
          <DialogDescription>
            Define what someone in this role is allowed to do. Capabilities are
            grouped by area &mdash; click a heading to toggle the whole group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior Tax Associate"
                data-testid="role-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Description (optional)</Label>
              <Input
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of what this role covers"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <Label>Capabilities ({caps.size} selected)</Label>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setCaps(new Set(caps.size === ALL_CAPABILITIES.length ? [] : (ALL_CAPABILITIES as any)))}
              >
                {caps.size === ALL_CAPABILITIES.length ? 'Clear all' : 'Select all'}
              </Button>
            </div>
            {CLUSTERS.map((cluster) => {
              const allSelected = cluster.caps.every((c) => caps.has(c));
              const someSelected = cluster.caps.some((c) => caps.has(c));
              return (
                <div key={cluster.label} className="rounded-lg border border-zinc-200 p-3">
                  <button
                    type="button"
                    onClick={() => toggleCluster(cluster.caps)}
                    className="text-sm font-semibold flex items-center gap-2 hover:text-teal-700"
                  >
                    <Checkbox
                      checked={allSelected}
                      data-state={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
                    />
                    {cluster.label}
                    <span className="text-xs text-zinc-400 font-normal">
                      ({cluster.caps.filter((c) => caps.has(c)).length} / {cluster.caps.length})
                    </span>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 pl-7">
                    {cluster.caps.map((c) => (
                      <label
                        key={c}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:text-zinc-900"
                      >
                        <Checkbox
                          checked={caps.has(c)}
                          onCheckedChange={() => toggleCap(c)}
                        />
                        <code className="font-mono text-[11px]">{c}</code>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending} data-testid="role-save-btn">
            {pending ? 'Saving…' : template ? 'Save changes' : 'Create role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

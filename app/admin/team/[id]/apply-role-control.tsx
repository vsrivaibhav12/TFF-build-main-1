'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { applyRoleTemplateAction, clearRoleTemplateAction } from '@/lib/actions/role-templates';
import type { RoleTemplate } from '@/lib/repositories/role-templates';
import { X } from 'lucide-react';

export default function ApplyRoleControl({
  userId,
  templates,
  activeTemplateId,
}: {
  userId: string;
  templates: RoleTemplate[];
  activeTemplateId?: string | null;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string>(activeTemplateId ?? '');
  const [pending, startTransition] = useTransition();

  function apply() {
    if (!chosen) {
      toast.error('Pick a role to apply');
      return;
    }
    startTransition(async () => {
      const r = await applyRoleTemplateAction({ user_id: userId, template_id: chosen });
      if (!r.success) toast.error(r.error);
      else {
        const granted = (r as any).data?.granted ?? 0;
        const revoked = (r as any).data?.revoked ?? 0;
        toast.success(`Role applied · +${granted} granted, -${revoked} revoked`);
        router.refresh();
      }
    });
  }

  function clearRole() {
    startTransition(async () => {
      const r = await clearRoleTemplateAction(userId);
      if (!r.success) toast.error(r.error);
      else {
        toast.success('Role template cleared');
        setChosen('');
        router.refresh();
      }
    });
  }

  if (templates.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        No role templates yet.{' '}
        <a href="/admin/team/roles" className="text-teal-700 hover:underline">
          Create one
        </a>{' '}
        to apply pre-defined access.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="apply-role">
      <Select value={chosen} onValueChange={setChosen}>
        <SelectTrigger className="w-56" data-testid="apply-role-select">
          <SelectValue placeholder="Choose a role template…" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} ({t.capabilities.length})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={apply}
        disabled={pending || !chosen || chosen === activeTemplateId}
        size="sm"
        data-testid="apply-role-btn"
      >
        {pending ? 'Applying…' : 'Apply role'}
      </Button>
      {activeTemplateId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRole}
          disabled={pending}
          className="text-zinc-500 hover:text-red-600"
          title="Clear role template"
        >
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}

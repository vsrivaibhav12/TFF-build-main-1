'use client';
import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { upsertCustomFieldValueAction, toggleTaskLabelAction } from '@/lib/actions/task-custom-fields';
import type { CustomFieldDefinition, CustomFieldValue, TaskLabel } from '@/lib/repositories/task-custom-fields';

interface Props {
  taskId: string;
  definitions: CustomFieldDefinition[];
  values: CustomFieldValue[];
  allLabels: TaskLabel[];
  assignedLabels: string[];
  readonly?: boolean;
}

export default function CustomFieldsPanel({
  taskId,
  definitions,
  values,
  allLabels,
  assignedLabels,
  readonly = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [assigned, setAssigned] = useState(new Set(assignedLabels));

  // Build a quick lookup of current values by definition_id
  const valueMap: Record<string, CustomFieldValue> = {};
  for (const v of values) valueMap[v.definition_id] = v;

  function persistValue(defId: string, fieldKey: keyof CustomFieldValue, raw: any) {
    startTransition(async () => {
      const def = definitions.find((d) => d.id === defId);
      if (!def) return;
      const payload: any = { task_id: taskId, definition_id: defId };
      // Clear all four typed columns, then set the right one based on field_type.
      payload.value_text = null;
      payload.value_number = null;
      payload.value_date = null;
      payload.value_bool = null;
      if (def.field_type === 'number') {
        payload.value_number = raw === '' || raw == null ? null : Number(raw);
      } else if (def.field_type === 'date') {
        payload.value_date = raw || null;
      } else if (def.field_type === 'boolean') {
        payload.value_bool = !!raw;
      } else {
        payload.value_text = raw === '' || raw == null ? null : String(raw);
      }
      const r = await upsertCustomFieldValueAction(payload);
      if (!r.success) toast.error(r.error);
    });
  }

  function toggleLabel(code: string, isOn: boolean) {
    // Optimistic update
    setAssigned((prev) => {
      const next = new Set(prev);
      if (isOn) next.add(code); else next.delete(code);
      return next;
    });
    startTransition(async () => {
      const r = await toggleTaskLabelAction({ task_id: taskId, label_code: code, assigned: isOn });
      if (!r.success) {
        toast.error(r.error);
        // Roll back
        setAssigned((prev) => {
          const next = new Set(prev);
          if (isOn) next.delete(code); else next.add(code);
          return next;
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Labels */}
      {allLabels.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            <Tag className="h-3.5 w-3.5 text-teal-600" /> Labels
          </h3>
          <div className="flex flex-wrap gap-2">
            {allLabels.map((l) => {
              const isOn = assigned.has(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  disabled={readonly || pending}
                  onClick={() => !readonly && toggleLabel(l.code, !isOn)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isOn ? 'border-transparent text-white' : 'border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50'
                  } ${readonly ? 'cursor-default opacity-60' : ''}`}
                  style={isOn ? { backgroundColor: l.color_hex ?? '#64748b' } : undefined}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.color_hex ?? '#64748b' }} />
                  {l.display_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom fields */}
      {definitions.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold mb-3">Custom fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {definitions.map((d) => {
              const v = valueMap[d.id];
              return (
                <div key={d.id} className="space-y-1.5">
                  <Label htmlFor={`cf-${d.id}`}>
                    {d.display_label}
                    {d.is_required && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  {d.field_type === 'text' && (
                    <Input
                      id={`cf-${d.id}`}
                      defaultValue={v?.value_text ?? ''}
                      onBlur={(e) => persistValue(d.id, 'value_text', e.target.value)}
                      disabled={readonly}
                    />
                  )}
                  {d.field_type === 'number' && (
                    <Input
                      id={`cf-${d.id}`}
                      type="number"
                      defaultValue={v?.value_number ?? ''}
                      onBlur={(e) => persistValue(d.id, 'value_number', e.target.value)}
                      disabled={readonly}
                    />
                  )}
                  {d.field_type === 'date' && (
                    <Input
                      id={`cf-${d.id}`}
                      type="date"
                      defaultValue={v?.value_date ?? ''}
                      onBlur={(e) => persistValue(d.id, 'value_date', e.target.value)}
                      disabled={readonly}
                    />
                  )}
                  {d.field_type === 'boolean' && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`cf-${d.id}`}
                        checked={!!v?.value_bool}
                        onCheckedChange={(c) => persistValue(d.id, 'value_bool', c)}
                        disabled={readonly}
                      />
                      <span className="text-xs text-zinc-500">{v?.value_bool ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {d.field_type === 'dropdown' && (
                    <Select
                      defaultValue={v?.value_text ?? ''}
                      onValueChange={(val) => persistValue(d.id, 'value_text', val)}
                      disabled={readonly}
                    >
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {(d.options_json?.options ?? []).map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
          {pending && (
            <div className="mt-3 text-xs text-teal-600 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

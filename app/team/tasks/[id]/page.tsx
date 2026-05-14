import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTask, listTaskActivity, listTaskNotes } from '@/lib/repositories/tasks';
import { listTeamUsers } from '@/lib/repositories/clients';
import { listTaskSteps } from '@/lib/repositories/task-steps';
import { listDocumentRequestsForTask } from '@/lib/repositories/document-requests';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { formatDateIST, timeAgo } from '@/lib/utils';
import TaskActions from './task-actions';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import SendReminderButton from '@/components/tasks/send-reminder-button';
import StuckToggle from '@/components/tasks/stuck-toggle';
import BlockedOnClientToggle from '@/components/tasks/blocked-on-client-toggle';
import DocumentRequestsPanel from '@/components/tasks/document-requests-panel';
import CustomFieldsPanel from '@/components/tasks/custom-fields-panel';
import WorkDonePanel from '@/components/tasks/workdone-panel';
import DeleteTaskButton from '@/components/tasks/delete-task-button';
import VerifyTaskButton from '@/components/tasks/verify-task-button';
import {
  listDefinitionsForSubService,
  listValuesForTask,
  listLabels,
  listLabelsForTask,
} from '@/lib/repositories/task-custom-fields';
import { listWorkDoneForTask } from '@/lib/repositories/workdone';
import { requireRole } from '@/lib/auth/require-role';

export const dynamic = 'force-dynamic';

export default async function TeamTaskDetail({ params }: { params: { id: string } }) {
  const me = await requireRole(['admin', 'team']);
  const task = await getTask(params.id);
  if (!task) notFound();
  const [activity, notes, team, steps, docReqs, cfDefs, cfValues, allLabels, assignedLabels, workdone] = await Promise.all([
    listTaskActivity(params.id),
    listTaskNotes(params.id),
    listTeamUsers(),
    listTaskSteps(params.id),
    listDocumentRequestsForTask(params.id),
    (task as any).sub_service_id ? listDefinitionsForSubService((task as any).sub_service_id) : Promise.resolve([]),
    listValuesForTask(params.id),
    listLabels(),
    listLabelsForTask(params.id),
    listWorkDoneForTask(params.id),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/team/tasks"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> Tasks
      </Link>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-zinc-400">{(task as any).task_number ?? '—'}</span>
          {(task as any).is_billable && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Billable{(task as any).bill_reference ? ` · ${(task as any).bill_reference}` : ''}
            </span>
          )}
        </div>
        <h1 className="tff-page-title">{task.title}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge
            variant={
              task.status === 'completed'
                ? 'success'
                : task.status === 'in_progress'
                ? 'teal'
                : 'warning'
            }
          >
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline">{task.priority}</Badge>
          {(task as any).is_verified && (
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
          )}
          <span className="text-sm text-zinc-500">
            {(task as any).clients?.business_name}
          </span>
        </div>
        {task.labels && task.labels.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {task.labels.map((label: string) => (
              <Badge key={label} variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="tff-card p-6">
            <h3 className="font-semibold mb-3">Description</h3>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {task.description || (
                <span className="text-zinc-400 italic">No description provided.</span>
              )}
            </p>
          </div>

          <StuckToggle
            taskId={task.id}
            isStuck={!!(task as any).is_stuck}
            reasonCode={(task as any).stuck_reason_code}
            reasonNote={(task as any).stuck_reason_note}
          />

          <TaskStepsPanel taskId={task.id} initial={steps as any} />

          <BlockedOnClientToggle
            taskId={task.id}
            isBlocked={!!(task as any).is_blocked_on_client}
          />

          <DocumentRequestsPanel
            taskId={task.id}
            subServiceId={(task as any).sub_service_id ?? null}
            initial={docReqs}
          />

          {(task as any).is_blocked_on_client && (
            <SendReminderButton taskId={task.id} />
          )}

          <TaskActions task={task} team={team} />

          <CustomFieldsPanel
            taskId={task.id}
            definitions={cfDefs}
            values={cfValues}
            allLabels={allLabels}
            assignedLabels={assignedLabels}
          />

          <WorkDonePanel taskId={task.id} initial={workdone} currentUserId={me.id} />

          <div className="tff-card p-6">
            <h3 className="font-semibold mb-4">Activity ({activity.length})</h3>
            <div className="relative pl-6 border-l-2 border-zinc-100 space-y-6">
              {activity.map((a: any) => (
                <div key={a.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-500" />
                  <div className="text-xs font-bold text-zinc-400 mb-1">{timeAgo(a.created_at)}</div>
                  <div className="text-sm text-zinc-700">
                    <span className="font-semibold text-zinc-900">{(a.users_profile as any)?.full_name || 'System'}</span>{' '}
                    {a.action}
                    {a.field_name === 'status' && (
                      <Badge variant="outline" className="ml-2 text-[10px] lowercase border-zinc-100 font-mono">
                        {a.old_value || '—'} → {a.new_value}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-zinc-400 text-sm">No activity recorded yet.</p>}
            </div>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="tff-card p-6">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <DetailItem label="Due" value={formatDateIST(task.due_date)} />
              <DetailItem label="Task number" value={(task as any).task_number ?? '—'} />
              <DetailItem label="Period" value={task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'} />
              <DetailItem label="Assignee" value={(task as any).assignee?.full_name || '—'} />
              <DetailItem label="Reviewer" value={(task as any).reviewer?.full_name || '—'} />
              <DetailItem label="Sub-service" value={(task as any).sub_services?.code || '—'} />
              <DetailItem label="Billing" value={(task as any).is_billable ? `Billable · ${(task as any).bill_reference || 'No ref'} · ₹${(task as any).bill_amount ?? 0}` : 'Non-billable'} />
              {(task as any).arn_reference && (
                <DetailItem label="ARN / Ref" value={`${(task as any).arn_reference}${(task as any).is_arn_client_visible ? ' (client visible)' : ''}`} />
              )}
            </dl>
          </div>

          {(task as any).status === 'completed' && (
            <div className="space-y-3">
              {(task as any).is_verified ? (
                <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="font-semibold">Verified</span>
                  <span className="text-teal-600">· {(task as any).verification_note || 'No note'}</span>
                </div>
              ) : (
                <VerifyTaskButton taskId={task.id} />
              )}
            </div>
          )}
          {(task as any).status !== 'completed' && (
            <div className="pt-2">
              <DeleteTaskButton taskId={task.id} redirectTo="/team/tasks" />
            </div>
          )}

          {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
            <div className="tff-card p-6">
              <h3 className="font-semibold mb-3">Custom Fields</h3>
              <dl className="space-y-3 text-sm">
                {Object.entries(task.custom_fields as Record<string, any>).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-zinc-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-zinc-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="tff-card p-6">
            <h3 className="font-semibold mb-3">Notes ({notes.length})</h3>
            <div className="space-y-4">
              {notes.map((n: any) => (
                <div key={n.id} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>{(n.users_profile as any)?.full_name}</span>
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{n.note_text}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-zinc-300 text-xs text-center py-4 italic">No internal notes yet.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

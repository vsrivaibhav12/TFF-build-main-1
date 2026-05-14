import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTask, listTaskActivity, listTaskNotes } from '@/lib/repositories/tasks';
import { listTeamUsers } from '@/lib/repositories/clients';
import { listTaskSteps } from '@/lib/repositories/task-steps';
import { listDocumentRequestsForTask } from '@/lib/repositories/document-requests';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ArrowLeft } from 'lucide-react';
import { formatDateIST, timeAgo } from '@/lib/utils';
import TaskActions from '@/app/team/tasks/[id]/task-actions';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import SendReminderButton from '@/components/tasks/send-reminder-button';
import StuckToggle from '@/components/tasks/stuck-toggle';
import BlockedOnClientToggle from '@/components/tasks/blocked-on-client-toggle';
import DocumentRequestsPanel from '@/components/tasks/document-requests-panel';
import DeleteTaskButton from '@/components/tasks/delete-task-button';
import VerifyTaskButton from '@/components/tasks/verify-task-button';

export const dynamic = 'force-dynamic';

export default async function AdminTaskDetail({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  if (!task) notFound();
  const [activity, notes, team, steps, docReqs] = await Promise.all([
    listTaskActivity(params.id),
    listTaskNotes(params.id),
    listTeamUsers(),
    listTaskSteps(params.id),
    listDocumentRequestsForTask(params.id),
  ]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/tasks"
          className="group inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-all"
        >
          <div className="p-2 rounded-full group-hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Task Hub
        </Link>
        <div className="text-right">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Global Admin View</div>
          <div className="text-xs font-bold text-zinc-900">{(task as any).clients?.business_name}</div>
        </div>
      </div>

      <div className="flex items-start justify-between">
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
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Badge
              className="rounded-full px-4 py-1 uppercase font-bold tracking-widest text-[10px]"
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
            <Badge variant="outline" className="rounded-full px-4 py-1 uppercase font-bold tracking-widest text-[10px] border-zinc-200">
              {task.priority} Priority
            </Badge>
            {(task as any).is_verified && (
              <Badge variant="outline" className="rounded-full px-4 py-1 uppercase font-bold tracking-widest text-[10px] border-teal-200 bg-teal-50 text-teal-700">
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SectionCard title="Description">
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
              {task.description || <span className="text-zinc-300 italic">No description provided.</span>}
            </p>
          </SectionCard>

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
            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-amber-900">Task Blocked on Client</h4>
                <p className="text-xs text-amber-700 mt-1">Send a reminder to the client to provide pending information.</p>
              </div>
              <SendReminderButton taskId={task.id} />
            </div>
          )}

          <SectionCard title="Activity Timeline">
            <div className="relative pl-6 border-l-2 border-zinc-100 space-y-8">
              {activity.map((a: any) => (
                <div key={a.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-500 shadow-[0_0_8px_#14b8a6]" />
                  <div className="text-xs font-bold text-zinc-400 mb-1">{timeAgo(a.created_at)}</div>
                  <div className="text-sm text-zinc-700">
                    <span className="font-bold text-zinc-900">{(a.users_profile as any)?.full_name || 'System'}</span>{' '}
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
          </SectionCard>
        </div>

        <aside className="space-y-8">
          <SectionCard title="Action Control">
            <TaskActions task={task} team={team} />
          </SectionCard>

          <SectionCard title="Details">
            <dl className="space-y-4 text-sm">
              <DetailItem label="Task number" value={(task as any).task_number ?? '—'} />
              <DetailItem label="Due Date" value={formatDateIST(task.due_date)} />
              <DetailItem label="Period" value={task.period_month && task.period_year ? `${task.period_month}/${task.period_year}` : '—'} />
              {task.period_quarter && <DetailItem label="Quarter" value={`Q${task.period_quarter}`} />}
              <DetailItem label="Assignee" value={(task as any).assignee?.full_name || 'Unassigned'} />
              <DetailItem label="Reviewer" value={(task as any).reviewer?.full_name || 'None'} />
              <DetailItem label="Sub-service" value={(task as any).sub_services?.name || 'Manual Task'} />
              <DetailItem label="Billing" value={(task as any).is_billable ? `Billable · ${(task as any).bill_reference || 'No ref'} · ₹${(task as any).bill_amount ?? 0}` : 'Non-billable'} />
              {(task as any).arn_reference && (
                <DetailItem label="ARN / Ref" value={`${(task as any).arn_reference}${(task as any).is_arn_client_visible ? ' (client visible)' : ''}`} />
              )}
            </dl>
          </SectionCard>

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
              <DeleteTaskButton taskId={task.id} redirectTo="/admin/tasks" />
            </div>
          )}

          <SectionCard title={`Internal Notes (${notes.length})`}>
            <div className="space-y-4">
              {notes.map((n: any) => (
                <div key={n.id} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>{(n.users_profile as any)?.full_name}</span>
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed">{n.note_text}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-zinc-300 text-xs text-center py-4 italic">No internal notes yet.</p>}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tff-card">
      <div className="p-5 border-b border-zinc-100">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 last:border-0">
      <dt className="text-zinc-500 font-medium text-xs">{label}</dt>
      <dd className="font-semibold text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

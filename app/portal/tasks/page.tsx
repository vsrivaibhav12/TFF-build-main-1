import Link from 'next/link';
import { listTasks } from '@/lib/repositories/tasks';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import {
  getClientVisibleStatus,
  CLIENT_VISIBLE_LABELS,
  CLIENT_VISIBLE_VARIANTS,
} from '@/lib/services/client-visible-status';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';
import { Briefcase, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortalTasks() {
  const tasks = await listTasks({});
  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div>
          <h1 className="tff-page-title">Work status</h1>
          <p className="tff-page-subtitle">
            See what is scheduled, in progress, under review, or completed.
          </p>
        </div>
      </StaggerItem>

      {tasks.length === 0 ? (
        <StaggerItem>
          <EmptyState
            title="No tasks yet"
            body="Your tasks will appear here once they are assigned."
            icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
          />
        </StaggerItem>
      ) : (
        <StaggerItem>
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-zinc-50/50">
                  <TableHead>Task</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t: any) => {
                  const cs = getClientVisibleStatus(t);
                  return (
                    <TableRow key={t.id} data-testid={`portal-task-row-${t.id}`} data-row>
                      <TableCell>
                        <Link
                          href={`/portal/tasks/${t.id}`}
                          className="font-medium text-zinc-900 hover:text-teal-700 transition-colors"
                        >
                          {t.title}
                        </Link>
                        {t.clients?.business_name && (
                          <div className="text-xs text-zinc-500 mt-0.5">{t.clients.business_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-600">{formatDateIST(t.due_date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={CLIENT_VISIBLE_VARIANTS[cs] as any}
                          data-testid={`portal-task-status-${t.id}`}
                        >
                          {CLIENT_VISIBLE_LABELS[cs]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-zinc-300" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}

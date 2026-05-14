import Link from 'next/link';
import { listTeamUsers } from '@/lib/repositories/clients';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users } from 'lucide-react';
import NewTeamMemberDialog from './new-member-dialog';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function AdminTeamPage() {
  const team = await listTeamUsers();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="tff-page-title">Team</h1>
          <p className="tff-page-subtitle">
            Internal users with admin or team role. Create an account with admin-assigned credentials.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="manage-roles-btn">
            <Link href="/admin/team/roles">
              <ShieldCheck className="h-4 w-4" /> Role templates
            </Link>
          </Button>
          <NewTeamMemberDialog />
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="p-0"><EmptyState title="No team members" body="Create the first team member to get started." actionHref="/admin/team" actionLabel="Create member" icon={<Users className="h-6 w-6 text-zinc-400" />} /></TableCell></TableRow>
            ) : (team.map((u: any) => (
              <TableRow key={u.id} className="cursor-pointer hover:bg-zinc-50">
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/team/${u.id}`}
                    className="hover:underline"
                    data-testid={`team-row-${u.id}`}
                  >
                    {u.full_name}
                  </Link>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'teal' : 'outline'}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="warning">Inactive</Badge>
                  )}
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

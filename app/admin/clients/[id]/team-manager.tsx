'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { assignTeamMember, unassignTeamMember } from '@/lib/actions/clients';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

export default function ClientTeamManager({
  clientId,
  assignments,
  availableTeam,
  clientUsers,
}: {
  clientId: string;
  assignments: any[];
  availableTeam: any[];
  clientUsers: any[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState('');
  const [role, setRole] = useState<'lead' | 'support' | 'reviewer'>('lead');

  function add() {
    if (!picked) return;
    startTransition(async () => {
      const r = await assignTeamMember({ clientId, teamUserId: picked, role });
      if (!r.success) toast.error(r.error);
      else { toast.success('Assigned'); setOpen(false); setPicked(''); router.refresh(); }
    });
  }

  function unassign(id: string) {
    if (!confirm('End this assignment?')) return;
    startTransition(async () => {
      const r = await unassignTeamMember(id, clientId);
      if (!r.success) toast.error(r.error);
      else { toast.success('Unassigned'); router.refresh(); }
    });
  }

  const activeAssignments = assignments.filter((a) => !a.assigned_to);
  const pastAssignments = assignments.filter((a) => a.assigned_to);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Team assigned to this client</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" data-testid="assign-team-btn"><Plus className="h-4 w-4" /> Assign team member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign team member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={picked} onValueChange={setPicked}>
                <SelectTrigger><SelectValue placeholder="Select team member…" /></SelectTrigger>
                <SelectContent>{availableTeam.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>)}</SelectContent>
              </Select>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['lead', 'support', 'reviewer'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter><Button onClick={add} disabled={!picked || pending}>Assign</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {activeAssignments.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 p-6 text-sm text-zinc-500 bg-zinc-50">No active assignments.</div>
      ) : (
        <div className="rounded-xl border border-zinc-200 divide-y">
          {activeAssignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{a.users_profile?.full_name}</div>
                <div className="text-xs text-zinc-500">{a.users_profile?.email} · since {a.assigned_from}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="teal">{a.role}</Badge>
                <Button variant="ghost" size="sm" onClick={() => unassign(a.id)} disabled={pending}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-zinc-700 mb-3">Client portal users</h4>
        {clientUsers.length === 0 ? (
          <div className="text-sm text-zinc-500">No portal users linked.</div>
        ) : (
          <ul className="space-y-2">{clientUsers.map((u: any) => <li key={u.id} className="text-sm">{u.users_profile?.full_name} — {u.users_profile?.email} <Badge variant="outline">{u.role_in_client}</Badge></li>)}</ul>
        )}
      </div>
    </div>
  );
}

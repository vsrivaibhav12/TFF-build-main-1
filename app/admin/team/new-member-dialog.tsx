'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTeamMemberAction } from '@/lib/actions/team';

export default function NewTeamMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'team' as 'team' | 'admin',
    job_title: '',
    department: '',
    phone_number: '',
  });

  function reset() {
    setForm({ full_name: '', email: '', password: '', role: 'team', job_title: '', department: '', phone_number: '' });
  }

  function submit() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Name, email and password are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    startTransition(async () => {
      const r = await createTeamMemberAction(form);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`Account created for ${form.email}`);
      setOpen(false);
      reset();
      router.push(`/admin/team/${r.data.user_id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button data-testid="new-team-member-btn">
          <Plus className="h-4 w-4" /> New team member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team member account</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500">
          Set their login credentials. They can sign in immediately and change their password later.
        </p>
        <div className="grid gap-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name *</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@firm.in" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Senior Tax Associate" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Tax" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Phone</Label>
              <Input id="phone_number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+91 9876543210" />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending} data-testid="invite-team-member">
            {pending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Creating…</> : 'Create account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

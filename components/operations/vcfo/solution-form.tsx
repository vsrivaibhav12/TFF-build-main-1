'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addSolutionAction } from '@/lib/actions/vcfo';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  clientId: string;
}

export default function SolutionForm({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueCategory, setIssueCategory] = useState('cash_flow');
  const [recommendedSolution, setRecommendedSolution] = useState('');
  const [financialImpact, setFinancialImpact] = useState('');
  const [rootCause, setRootCause] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await addSolutionAction({
      client_id: clientId,
      issue_identified_date: new Date().toISOString().slice(0, 10),
      issue_description: issueDescription,
      issue_category: issueCategory as any,
      recommended_solution: recommendedSolution,
      financial_impact_estimate: financialImpact === '' ? undefined : Number(financialImpact),
      root_cause: rootCause || undefined,
    });
    setLoading(false);
    if (res.success) {
      setOpen(false);
      setIssueDescription('');
      setRecommendedSolution('');
      setFinancialImpact('');
      setRootCause('');
      window.location.reload();
    } else {
      alert(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" /> Add entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add advisory entry</DialogTitle>
          <DialogDescription>Record an issue and recommended solution for the client.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <option value="cash_flow">Cash flow</option>
              <option value="profitability">Profitability</option>
              <option value="tax_optimization">Tax optimization</option>
              <option value="working_capital">Working capital</option>
              <option value="vendor_management">Vendor management</option>
              <option value="process">Process</option>
              <option value="compliance">Compliance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue">Issue description</Label>
            <Textarea id="issue" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={2} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solution">Recommended solution</Label>
            <Textarea id="solution" value={recommendedSolution} onChange={(e) => setRecommendedSolution(e.target.value)} rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="impact">Financial impact estimate</Label>
              <Input id="impact" type="number" min={0} value={financialImpact} onChange={(e) => setFinancialImpact(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="root-cause">Root cause</Label>
              <Input id="root-cause" value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

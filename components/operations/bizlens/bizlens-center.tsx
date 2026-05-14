'use client';

import { BarChart3, ChevronRight, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateBizlensDialog } from '@/components/operations/bizlens/create-bizlens-dialog';

interface BizLensReport {
  id: string;
  period_month: number;
  period_year: number;
  months_covered: number;
  status: string;
}

interface Props {
  clientId: string;
  clientName: string;
  reports: BizLensReport[];
  role: 'admin' | 'team';
}

export default function BizLensCenter({ clientId, clientName, reports, role }: Props) {
  const basePath = `/${role}/clients/${clientId}/bizlens`;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">BizLens Center</h1>
          <p className="text-zinc-500 mt-2 text-lg">
            Financial intelligence and diagnostic reporting for <span className="text-zinc-900 font-bold">{clientName}</span>.
          </p>
        </div>
        <CreateBizlensDialog clientId={clientId} role={role} />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-20 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="mx-auto w-20 h-20 rounded-xl bg-white  flex items-center justify-center border border-zinc-100">
              <BarChart3 className="h-10 w-10 text-teal-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-900">No reports generated</h3>
              <p className="text-sm text-zinc-500">
                Generate the first BizLens diagnostic to unlock deep financial insights and growth metrics.
              </p>
            </div>
            <CreateBizlensDialog clientId={clientId} role={role} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="group relative rounded-xl border border-zinc-200 bg-white p-6 transition-all hover: hover:border-teal-200 hover:-translate-y-1">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
                    <Calendar className="h-6 w-6 text-zinc-400 group-hover:text-teal-600" />
                  </div>
                  <Badge variant={report.status === 'published' ? 'teal' : 'outline'} className={report.status === 'published' ? 'bg-emerald-500 hover:bg-emerald-600 rounded-full' : 'rounded-full'}>
                    {report.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 tracking-tight">
                    {new Date(report.period_year, (report.period_month || 1) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    {report.months_covered} Month {report.months_covered > 1 ? 'Diagnostic' : 'Snapshot'}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" className="flex-1 rounded-2xl border-zinc-200 hover:bg-zinc-50 font-bold" asChild>
                    <Link href={`${basePath}/${report.id}/input`}>Edit Data</Link>
                  </Button>
                  <Button variant="default" className="flex-1 rounded-2xl bg-teal-600 hover:bg-teal-700 font-bold  " asChild>
                    <Link href={`${basePath}/${report.id}/output`}>View Report</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

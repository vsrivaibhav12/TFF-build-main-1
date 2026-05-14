'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import SummaryTab from './tab-summary';
import OperatingTab from './tab-operating';
import HealthTab from './tab-health';
import InsightsTab from './tab-insights';
import SimulatorTab from './tab-simulator';
import TrendsTab from './tab-trends';

export default function BizlensOutputDashboard({
  data, report, insights, summary, score,
  wcc, breakEven, debtFreedom, opportunities,
  clientId, isPortal = false, role = 'team',
  trends, projections,
}: any) {
  const basePath = role === 'admin' ? '/admin' : '/team';

  return (
    <div className="tff-stack-lg">
      {/* Header */}
      <div className="tff-card p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="tff-page-title">
              {isPortal ? 'Your business health' : `BizLens · ${summary?.clientName ?? 'Report'}`}
            </h1>
            <Badge variant={data?.status === 'published' ? 'success' : 'outline'}>
              {data?.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="tff-page-subtitle">
            Period: {new Date(data?.period_year ?? 2024, (data?.period_month ?? 1) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} ({data?.months_covered ?? 12} mo)
          </p>
        </div>
        {!isPortal && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${basePath}/bizlens/${data?.id}/input`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to inputs
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="bg-zinc-100 border border-zinc-200 p-1 rounded-lg mb-6 inline-flex flex-wrap gap-0.5 h-auto">
          {[
            { v: 'summary', l: 'Summary' },
            { v: 'operating', l: 'Operating' },
            { v: 'health', l: 'Health' },
            { v: 'insights', l: 'Insights' },
            { v: 'simulator', l: 'Simulator' },
            { v: 'trends', l: 'Trends' },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="text-sm px-3.5 py-1.5 rounded-md font-medium text-zinc-600 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm transition-all"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary">
          <SummaryTab summary={summary} score={score} insights={insights} opportunities={opportunities} wcc={wcc} breakEven={breakEven} debtFreedom={debtFreedom} />
        </TabsContent>

        <TabsContent value="operating">
          <OperatingTab report={report} breakEven={breakEven} />
        </TabsContent>

        <TabsContent value="health">
          <HealthTab report={report} wcc={wcc} debtFreedom={debtFreedom} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab insights={insights} />
        </TabsContent>

        <TabsContent value="simulator">
          <SimulatorTab report={report} />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsTab trends={trends} projections={projections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

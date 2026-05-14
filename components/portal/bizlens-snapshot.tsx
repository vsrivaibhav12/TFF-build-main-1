'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ArrowRight, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import Link from 'next/link';

export default function BizlensSnapshot({ report, score, clientId }: any) {
  if (!report) return null;

  const bandColors: Record<string, string> = {
    elite: 'bg-emerald-500',
    strong: 'bg-emerald-500',
    improve: 'bg-amber-500',
    atrisk: 'bg-orange-500',
    critical: 'bg-rose-500',
  };

  const fmtMoney = (n: number) => {
    return 'Rs. ' + Math.abs(Math.round(n)).toLocaleString('en-IN');
  };

  return (
    <Card className="border-0 shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-teal-100 transition-all">
      <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-zinc-50/50">
        <div>
           <CardTitle className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
             <Activity className="w-6 h-6 text-teal-600" /> Financial Intelligence
           </CardTitle>
           <p className="text-zinc-500 font-medium mt-1">Latest diagnostic summary</p>
        </div>
        <Badge className={`${bandColors[score.bandColor]} text-white px-4 py-1.5 rounded-full font-bold text-sm`}>
           {score.band}
        </Badge>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">BizLens Score</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-semibold text-zinc-900">{score.total}</span>
                 <span className="text-lg font-bold text-zinc-400">/ 1000</span>
              </div>
           </div>
           
           <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Monthly Profit</p>
              <div className="flex items-center gap-2">
                 <span className={`text-3xl font-semibold ${report.monthly.opProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmtMoney(report.monthly.opProfit)}
                 </span>
                 {report.monthly.opProfit >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
              </div>
           </div>

           <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Cash Runway</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-semibold text-zinc-900">{report.health.cashRunway?.toFixed(1) || '--'}</span>
                 <span className="text-lg font-bold text-zinc-400">months</span>
              </div>
           </div>
        </div>

        <div className="mt-10 pt-8 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-50 rounded-2xl">
                 <Shield className="w-6 h-6 text-teal-600" />
              </div>
              <p className="text-zinc-600 font-medium">
                 Your business health is currently <span className="font-bold text-zinc-900">{score.band.toLowerCase()}</span>. 
                 Review the full report for strategic recommendations.
              </p>
           </div>
           <Button className="w-full md:w-auto bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl px-10 h-14 font-bold text-lg group-hover:bg-teal-600 transition-colors" asChild>
              <Link href="/portal/bizlens">
                 View Full Report <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}

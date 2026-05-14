'use client';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import LineChart from '@/components/charts/line-chart';
import BarChart from '@/components/charts/bar-chart';

interface TrendDirection { pct: number; dir: 'up' | 'down' | 'flat' }
interface TrendAnalysis {
  periods: number;
  labels: string[];
  data: { sales: number[]; vc: number[]; fc: number[]; profit: number[]; cmPct: number[]; be: number[] };
  directions: { sales: TrendDirection; profit: TrendDirection; cm: TrendDirection; fc: TrendDirection };
  keyInsights: { type: 'good' | 'warn' | 'bad'; text: string }[];
  healthInsights: { type: 'good' | 'warn' | 'bad'; text: string }[];
}
interface FutureProjection {
  projections: { period: string; sales: number; profit: number | null; cmPct: number | null; fc: number | null }[];
  confidence: { sales: number; profit: number | null };
  historical: { labels: string[]; sales: number[]; profit: number[] };
}

interface Props {
  trends?: TrendAnalysis | null;
  projections?: FutureProjection | null;
}

function DirIcon({ dir }: { dir: TrendDirection }) {
  if (dir.dir === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (dir.dir === 'down') return <TrendingDown className="h-4 w-4 text-rose-500" />;
  return <Minus className="h-4 w-4 text-zinc-400" />;
}

export default function TrendsTab({ trends, projections }: Props) {
  if (!trends || !trends.directions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] text-center px-4">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200">
          <TrendingUp className="h-5 w-5 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">No trend data available</h3>
        <p className="text-xs text-zinc-500 max-w-sm">Add prior period snapshots in the BizLens Studio input form to enable multi-period trend analysis.</p>
      </div>
    );
  }

  const dirs = trends.directions;
  const dirCards = [
    { name: 'Sales', dir: dirs.sales, data: trends.data.sales },
    { name: 'Operating profit', dir: dirs.profit, data: trends.data.profit },
    { name: 'Contribution margin', dir: dirs.cm, data: trends.data.cmPct },
    { name: 'Fixed costs', dir: dirs.fc, data: trends.data.fc },
  ];

  return (
    <div className="space-y-6">
      {/* Direction Cards */}
      <Card className="border border-zinc-200 rounded-xl p-6">
        <h3 className="tff-section-title mb-4">Trend analysis ({trends.periods} periods)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {dirCards.map((d) => (
            <div key={d.name} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-center">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{d.name}</div>
              <div className={`text-2xl font-semibold ${d.dir.dir === 'up' ? 'text-emerald-600' : d.dir.dir === 'down' ? 'text-rose-600' : 'text-zinc-500'}`}>
                <span className="inline-flex items-center gap-1">
                  <DirIcon dir={d.dir} />
                  {Math.abs(d.dir.pct)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Sales & Profit Trend Chart */}
        <div className="mb-6">
          <LineChart
            categories={trends.labels}
            series={[
              { name: 'Sales', data: trends.data.sales, color: '#0D9488' },
              { name: 'Profit', data: trends.data.profit, color: '#6366F1' },
            ]}
            title="Sales & profit trend"
            height={300}
          />
        </div>

        {/* CM% & Fixed Costs Chart */}
        <div className="mb-6">
          <LineChart
            categories={trends.labels}
            series={[
              { name: 'CM %', data: trends.data.cmPct.map(v => Math.round(v * 1000) / 10), color: '#F59E0B' },
              { name: 'Fixed costs', data: trends.data.fc, color: '#EC4899' },
            ]}
            title="Contribution margin % & fixed costs"
            height={300}
          />
        </div>

        {/* Key Insights */}
        {trends.keyInsights.length > 0 && (
          <div className="space-y-2 mb-6">
            <h4 className="text-sm font-semibold text-zinc-900">Key insights</h4>
            {trends.keyInsights.map((ins, i) => (
              <div key={i} className={`p-3 rounded-xl border text-xs font-medium ${ins.type === 'good' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : ins.type === 'bad' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                {ins.text}
              </div>
            ))}
          </div>
        )}

        {/* Health Insights */}
        {trends.healthInsights && trends.healthInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-900">Health trend</h4>
            {trends.healthInsights.map((ins, i) => (
              <div key={i} className={`p-3 rounded-xl border text-xs font-medium ${ins.type === 'good' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                {ins.text}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Future Projections */}
      {projections && projections.projections.length > 0 && (
        <Card className="border border-zinc-200 rounded-xl p-6">
          <h3 className="tff-section-title mb-4">Future projections</h3>
          <p className="text-xs text-zinc-500 mb-4">Linear regression forecast based on historical data. Confidence (sales R²): {(projections.confidence.sales * 100).toFixed(0)}%</p>

          <div className="mb-6">
            <BarChart
              categories={[...projections.historical.labels, ...projections.projections.map(p => p.period)]}
              series={[
                { name: 'Sales', data: [...projections.historical.sales, ...projections.projections.map(p => p.sales)] },
                { name: 'Profit', data: [...projections.historical.profit, ...projections.projections.map(p => p.profit ?? 0)] },
              ]}
              title="Historical + projected sales & profit"
              height={300}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {projections.projections.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{p.period}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Sales</span><span className="font-medium">₹{(p.sales / 1e5).toFixed(1)}L</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Profit</span><span className="font-medium">₹{p.profit != null ? (p.profit / 1e5).toFixed(1) + 'L' : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">CM %</span><span className="font-medium">{p.cmPct != null ? (p.cmPct * 100).toFixed(1) + '%' : '—'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

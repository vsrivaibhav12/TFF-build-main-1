'use client';

import { DashboardCell } from '@/lib/repositories/compliance-dashboard';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Briefcase, 
  Calendar as CalendarIcon, 
  ChevronRight,
  TrendingUp,
  Target
} from 'lucide-react';
import Link from 'next/link';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';

const KIND_LABEL: Record<string, string> = {
  gst: 'GST', tds: 'TDS', tcs: 'TCS', it: 'Income Tax', roc: 'ROC',
  pf: 'PF', esi: 'ESI', pt: 'PT', other: 'Other',
};

const COLORS = {
  filed: '#10b981',      // Emerald 500
  stuck: '#ef4444',      // Red 500
  overdue: '#f59e0b',    // Amber 500
  upcoming: '#6366f1',   // Indigo 500
  task_created: '#14b8a6' // Teal 500
};

interface Props {
  cells: DashboardCell[];
  role: 'admin' | 'team';
}

export default function ComplianceDashboard({ cells, role }: Props) {
  const grouped: Record<string, DashboardCell[]> = {};
  for (const c of cells) {
    grouped[c.service_kind] = grouped[c.service_kind] ?? [];
    grouped[c.service_kind].push(c);
  }

  const basePath = `/${role}`;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Events" 
          value={cells.reduce((a, b) => a + b.total_clients, 0)} 
          subtitle="Across all services"
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard 
          title="Filing Rate" 
          value={Math.round((cells.reduce((a, b) => a + b.filed, 0) / cells.reduce((a, b) => a + Math.max(1, b.total_clients), 0)) * 100) + '%'} 
          subtitle="Target: 98%"
          icon={<Target className="h-4 w-4 text-teal-500" />}
        />
        <StatCard 
          title="Stuck Items" 
          value={cells.reduce((a, b) => a + b.stuck, 0)} 
          subtitle="Requiring attention"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          alert={cells.reduce((a, b) => a + b.stuck, 0) > 0}
        />
        <StatCard 
          title="Overdue" 
          value={cells.reduce((a, b) => a + b.overdue, 0)} 
          subtitle="Action required"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          alert={cells.reduce((a, b) => a + b.overdue, 0) > 0}
        />
      </div>

      {cells.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white/50 p-20 text-center backdrop-blur-sm">
          <div className="max-w-md mx-auto space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">No compliance data found</h3>
            <p className="text-sm text-zinc-500">
              Set compliance profiles on at least one client and refresh the rules engine to see statutory work here.
            </p>
            <Link href={`${basePath}/settings/compliance-rules`}>
              <button className="mt-4 px-6 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-all">
                Configure Rules
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(grouped).map(([kind, rows]) => (
            <div key={kind} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  {KIND_LABEL[kind] ?? kind}
                </h2>
                <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-zinc-200 text-zinc-500">
                  {rows.length} Active Periods
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {rows.slice(0, 3).map((c) => (
                  <ComplianceRowCard key={`${c.rule_code}-${c.period_label}`} cell={c} basePath={basePath} />
                ))}
                {rows.length > 3 && (
                  <button className="w-full py-3 rounded-2xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all flex items-center justify-center gap-1 group">
                    View {rows.length - 3} more {KIND_LABEL[kind] ?? kind} periods
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, alert }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 group ${alert ? 'border-red-100' : ''}`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110" />
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100">
            {icon}
          </div>
          {alert && (
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>
          )}
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900">{value}</div>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-1">{title}</div>
          <div className="text-[10px] text-zinc-400 mt-2">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function ComplianceRowCard({ cell, basePath }: { cell: DashboardCell; basePath: string }) {
  const chartData = [
    { name: 'Filed', value: cell.filed, color: COLORS.filed },
    { name: 'Stuck', value: cell.stuck, color: COLORS.stuck },
    { name: 'Overdue', value: cell.overdue, color: COLORS.overdue },
    { name: 'In Progress', value: cell.task_created, color: COLORS.task_created },
    { name: 'Upcoming', value: cell.upcoming, color: COLORS.upcoming },
  ].filter(d => d.value > 0);

  // If no data yet, show a grey placeholder donut
  if (chartData.length === 0) {
    chartData.push({ name: 'Empty', value: 1, color: '#f4f4f5' });
  }

  return (
    <div className="group relative rounded-3xl border border-zinc-200 bg-white p-5 transition-all hover:shadow-xl hover:border-teal-200">
      <div className="flex items-center gap-5">
        {/* Semi-Donut Chart */}
        <div className="w-20 h-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={38}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-zinc-200 rounded-xl p-2 shadow-xl text-[10px] font-bold">
                        {payload[0].name}: {payload[0].value}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 truncate leading-none">{cell.rule_name}</h3>
                <Badge variant="outline" className="text-[9px] font-mono border-zinc-100 bg-zinc-50 text-zinc-400">
                  {cell.rule_code}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-zinc-400 mt-1.5 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {cell.period_label} · Due {formatDateIST(cell.period_due_date)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-zinc-900 tabular-nums">{cell.total_clients}</div>
              <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Clients</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge count={cell.filed} label="Filed" variant="success" icon={<CheckCircle2 className="h-2.5 w-2.5" />} />
            <StatusBadge count={cell.task_created} label="Active" variant="teal" icon={<Briefcase className="h-2.5 w-2.5" />} />
            <StatusBadge count={cell.stuck} label="Stuck" variant="destructive" icon={<AlertTriangle className="h-2.5 w-2.5" />} />
            <StatusBadge count={cell.overdue} label="Overdue" variant="warning" />
          </div>
        </div>

        <div className="shrink-0 transition-transform group-hover:translate-x-1">
          <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ count, label, variant, icon }: { count: number; label: string; variant: any; icon?: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all hover:scale-105
      ${variant === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : ''}
      ${variant === 'teal' ? 'bg-teal-50 border-teal-100 text-teal-600' : ''}
      ${variant === 'destructive' ? 'bg-red-50 border-red-100 text-red-600' : ''}
      ${variant === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-600' : ''}
    `}>
      {icon}
      <span>{count}</span>
      <span className="opacity-60">{label}</span>
    </div>
  );
}

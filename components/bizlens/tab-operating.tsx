'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fmtMoney, fmtPct } from './fmt';

export default function OperatingTab({ report, breakEven }: any) {
  if (!report) return null;
  const m = report.monthly;
  const t = report.totals;

  const kpis = [
    { label: 'Monthly Sales', value: fmtMoney(m.Rm), sub: `Total: ${fmtMoney(t.R)}`, color: '' },
    { label: 'Variable Costs', value: fmtMoney(m.VCm), sub: `Total: ${fmtMoney(t.VC)}`, color: '' },
    { label: 'Fixed Costs', value: fmtMoney(m.FCm), sub: `Total: ${fmtMoney(t.FC)}`, color: '', tag: fmtPct(m.fcPct) },
    { label: 'Contribution Margin', value: fmtPct(m.cmPct), sub: `${fmtMoney(m.contribution)} after variable costs`, color: '' },
    { label: 'Break-Even Point', value: fmtMoney(m.beSales), sub: 'Monthly minimum sales', color: '' },
    { label: 'Margin of Safety', value: fmtMoney(m.mos), sub: `${fmtPct(m.mosPct)} of sales`, color: '', mosPct: m.mosPct },
    { label: 'Operating Profit', value: fmtMoney(m.opProfit), sub: fmtPct(m.opPct), color: m.opProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', tag: fmtPct(m.opPct) },
    { label: 'Actual P&L', value: fmtMoney(t.actualPL), sub: `Op: ${fmtMoney(t.opTotal)} + Inv: ${fmtMoney(t.INV)} + OI: ${fmtMoney(t.OI)} − NC: ${fmtMoney(t.NC)}`, color: t.actualPL >= 0 ? 'text-emerald-600' : 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <Card className="border border-zinc-200  rounded-xl overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="tff-section-title">Operating Performance</CardTitle>
          <CardDescription className="text-sm mt-1">Current monthly averages over {t.M} months</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2 relative">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{k.label}</p>
                  {k.tag && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">{k.tag}</span>}
                </div>
                <p className={`text-xl font-semibold ${k.color || 'text-zinc-900'}`}>{k.value}</p>
                {k.mosPct != null && (
                  <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${(k.mosPct ?? 0) < 0.1 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: Math.max(0, Math.min(100, (k.mosPct ?? 0) * 100)) + '%' }} />
                  </div>
                )}
                <p className="text-[10px] text-zinc-500 font-medium leading-tight">{k.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Split Bar */}
      <Card className="border border-zinc-200  rounded-xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-lg font-semibold text-zinc-900">Monthly Cost-Revenue Split</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <div className="space-y-3">
            {[
              { label: 'Revenue', val: m.Rm, color: 'bg-teal-500' },
              { label: 'Variable Costs', val: m.VCm, color: 'bg-blue-500' },
              { label: 'Fixed Costs', val: m.FCm, color: 'bg-violet-500' },
              { label: 'Operating Profit', val: m.opProfit, color: m.opProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500' },
            ].map((item) => {
              const pct = m.Rm > 0 ? Math.abs(item.val) / m.Rm * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-zinc-500 w-28 text-right">{item.label}</span>
                  <div className="flex-1 h-5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: Math.min(100, pct) + '%' }} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-700 w-28">{fmtMoney(item.val)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Break-Even Days */}
      {breakEven && (
        <Card className="border border-zinc-200  rounded-xl overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-lg font-semibold text-zinc-900">Break-Even Days</CardTitle>
            <CardDescription className="text-sm">When does your business start making money each month?</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 bg-teal-50 border border-teal-100 rounded-xl text-center">
                <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Costs Covered By</div>
                <div className="text-4xl font-semibold text-teal-700">Day {breakEven.beDays}</div>
              </div>
              <div className="p-6 bg-zinc-900 text-white rounded-xl text-center">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Profit Days</div>
                <div className="text-4xl font-semibold text-teal-400">{breakEven.profitDays} days</div>
              </div>
              <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-xl text-center">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Daily Profit</div>
                <div className={`text-2xl font-semibold ${breakEven.dailyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(breakEven.dailyProfit)}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-600 font-medium leading-relaxed">{breakEven.narrative}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtMoney, fmtNum, fmtPct } from './fmt';

/** Client-side risk assessment — simplified version that mirrors server logic */
function assessRiskLocal(value: any, type: string, extra?: any): { level: string; label: string } {
  const DEF = { cashHigh: 3, cashGood: 6, deHigh: 1, deLow: 2, icrHigh: 1.5, icrLow: 3, concHigh: 50, concMed: 30, wcSalesHigh: 40 };
  if (type === 'cashRunway') {
    if (value == null) return { level: 'neutral', label: 'N/A' };
    if (value < DEF.cashHigh) return { level: 'bad', label: 'CRITICAL' };
    if (value < DEF.cashGood) return { level: 'medium', label: 'WATCH' };
    return { level: 'good', label: 'HEALTHY' };
  }
  if (type === 'deRatio') {
    if (extra?.isDebtFree) return { level: 'good', label: 'DEBT-FREE' };
    if (value == null) return { level: 'neutral', label: 'N/A' };
    if (value > DEF.deLow) return { level: 'bad', label: 'HIGH' };
    if (value > DEF.deHigh) return { level: 'medium', label: 'MODERATE' };
    return { level: 'good', label: 'LOW' };
  }
  if (type === 'icr') {
    if (extra?.isInterestFree) return { level: 'good', label: 'NO INTEREST' };
    if (value == null) return { level: 'neutral', label: 'N/A' };
    if (value < DEF.icrHigh) return { level: 'bad', label: 'WEAK' };
    if (value < DEF.icrLow) return { level: 'medium', label: 'TIGHT' };
    return { level: 'good', label: 'STRONG' };
  }
  if (type === 'concentration') {
    if (value == null) return { level: 'neutral', label: 'N/A' };
    if (value > DEF.concHigh) return { level: 'bad', label: 'HIGH' };
    if (value > DEF.concMed) return { level: 'medium', label: 'MODERATE' };
    return { level: 'good', label: 'DIVERSIFIED' };
  }
  if (type === 'wcSales') {
    if (extra?.wc < 0 && extra?.wcIntentional) return { level: 'good', label: 'STRATEGIC' };
    if (extra?.wc < 0) return { level: 'medium', label: 'NEGATIVE' };
    if (value > DEF.wcSalesHigh) return { level: 'medium', label: 'HIGH' };
    return { level: 'good', label: 'OK' };
  }
  if (type === 'networth') {
    if (value == null) return { level: 'neutral', label: 'N/A' };
    if (value <= 0) return { level: 'bad', label: 'NEGATIVE' };
    const eq = extra?.equity ?? 0;
    if (eq > 0 && value < eq * 0.975) return { level: 'medium', label: 'BELOW EQUITY' };
    return { level: 'good', label: 'POSITIVE' };
  }
  if (type === 'arAgeing' || type === 'apAgeing') {
    if (!value) return { level: 'medium', label: 'NOT TRACKED' };
    const total = value.d0_30 + value.d31_60 + value.d61_90 + value.d90p;
    const pct90 = total > 0 ? (value.d90p / total * 100) : 0;
    if (pct90 > 20) return { level: 'bad', label: 'POOR' };
    if (pct90 > 10) return { level: 'medium', label: 'ELEVATED' };
    return { level: 'good', label: 'GOOD' };
  }
  return { level: 'neutral', label: '—' };
}


function RiskTag({ risk }: { risk: any }) {
  const c = risk.level === 'good' ? 'bg-emerald-100 text-emerald-700' : risk.level === 'bad' ? 'bg-rose-100 text-rose-700' : risk.level === 'neutral' ? 'bg-zinc-100 text-zinc-500' : 'bg-amber-100 text-amber-700';
  return <Badge className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${c}`}>{risk.label}</Badge>;
}

function HealthCard({ title, children, risk }: { title: string; children: React.ReactNode; risk: any }) {
  return (
    <Card className="border border-zinc-200  rounded-xl p-6 relative">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-base font-semibold text-zinc-800">{title}</h4>
        <RiskTag risk={risk} />
      </div>
      {children}
    </Card>
  );
}

export default function HealthTab({ report, wcc, debtFreedom }: any) {
  if (!report) return null;
  const { monthly: m, bs, health: h } = report;

  const cashRisk = assessRiskLocal(h.cashRunway, 'cashRunway');
  const wcRisk = assessRiskLocal(bs.wcSalesRatio, 'wcSales', { wc: bs.wc, wcIntentional: h.wcIntentional });
  const arRisk = assessRiskLocal(h.arAgeing, 'arAgeing');
  const apRisk = assessRiskLocal(h.apAgeing, 'apAgeing', { apStrategic: h.apStrategic });
  const deRisk = assessRiskLocal(h.deRatio, 'deRatio', { isDebtFree: h.isDebtFree });
  const icrRisk = assessRiskLocal(h.icr, 'icr', { isInterestFree: h.isInterestFree });
  const custRisk = assessRiskLocal(h.topCust, 'concentration');
  const suppRisk = assessRiskLocal(h.topSupp, 'concentration');
  const nwRisk = assessRiskLocal(bs.realNetworth, 'networth', { equity: bs.eq });

  // Overall badge
  const badCount = [cashRisk, wcRisk, deRisk, icrRisk, custRisk, suppRisk].filter(r => r.level === 'bad').length;
  const medCount = [cashRisk, wcRisk, deRisk, icrRisk, custRisk, suppRisk].filter(r => r.level === 'medium').length;
  const overallClass = badCount >= 3 ? 'bg-rose-500' : (badCount >= 1 || medCount >= 3) ? 'bg-amber-500' : 'bg-emerald-500';
  const overallLabel = badCount >= 3 ? '🔴 HIGH RISK' : (badCount >= 1 || medCount >= 3) ? '🟠 WATCH' : '🟢 HEALTHY';

  return (
    <div className="space-y-8">
      {/* Overall Badge */}
      <div className="flex justify-end">
        <Badge className={`${overallClass} text-white text-sm px-4 py-1.5 rounded-full font-bold`}>{overallLabel}</Badge>
      </div>

      {/* 1. Liquidity */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">1</span> Liquidity & Working Capital
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard title="Cash Runway" risk={cashRisk}>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-semibold text-zinc-900">{h.cashRunway != null ? fmtNum(h.cashRunway, 1) : '--'}</span>
              <span className="text-base font-bold text-zinc-400">months</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: Math.min(100, (h.cashRunway ?? 0) / 10 * 100) + '%' }} />
            </div>
            <p className="text-xs text-zinc-500">Cash: <strong>{fmtMoney(bs.cash)}</strong> | Monthly outflow: <strong>{fmtMoney(h.stressOutflow)}</strong></p>
          </HealthCard>

          <HealthCard title="Working Capital" risk={wcRisk}>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[{ l: 'AR', v: bs.ar }, { l: 'Inv', v: bs.inv }, { l: 'AP', v: bs.ap }, { l: 'Net', v: bs.wc }].map(x => (
                <div key={x.l} className="text-center p-2 bg-zinc-50 rounded-lg">
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">{x.l}</div>
                  <div className="text-xs font-semibold text-zinc-900">{fmtMoney(x.v)}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500">WC/Sales ratio: <strong>{fmtNum(bs.wcSalesRatio, 1)}%</strong></p>
          </HealthCard>

          {wcc && (
            <Card className="border border-zinc-200  rounded-xl p-6 md:col-span-2">
              <h4 className="text-base font-semibold text-zinc-800 mb-4">Cash Conversion Cycle</h4>
              <div className="grid grid-cols-4 gap-3">
                {[{ l: 'DSO (AR)', v: wcc.dso, u: 'd' }, { l: 'DIO (Inv)', v: wcc.dio, u: 'd' }, { l: 'DPO (AP)', v: wcc.dpo, u: 'd' }, { l: 'Total CCC', v: wcc.ccc, u: 'd' }].map(x => (
                  <div key={x.l} className={`text-center p-4 rounded-xl border ${x.l === 'Total CCC' ? 'bg-teal-50 border-teal-100' : 'bg-zinc-50 border-zinc-100'}`}>
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{x.l}</div>
                    <div className={`text-2xl font-semibold ${x.l === 'Total CCC' ? 'text-teal-700' : 'text-zinc-900'}`}>{x.v}{x.u}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-50 rounded-lg"><span className="text-zinc-500">Cash locked in cycle:</span> <strong>{fmtMoney(wcc.cashLockedInCycle)}</strong></div>
                <div className="p-3 bg-zinc-50 rounded-lg"><span className="text-zinc-500">WC financing cost:</span> <strong>{fmtMoney(wcc.wcFinancingCost)}/yr</strong></div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 2. Discipline */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">2</span> Discipline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard title="Receivables" risk={arRisk}>
            {h.arAgeing ? (() => {
              const total = h.arAgeing.d0_30 + h.arAgeing.d31_60 + h.arAgeing.d61_90 + h.arAgeing.d90p;
              const pct90 = total > 0 ? (h.arAgeing.d90p / total * 100) : 0;
              return (<>
                <p className="text-xs text-zinc-600 mb-2">{fmtNum(pct90, 1)}% of receivables overdue beyond 90 days</p>
                <div className="grid grid-cols-4 gap-1">
                  {[{ l: '0-30d', v: h.arAgeing.d0_30 }, { l: '31-60d', v: h.arAgeing.d31_60 }, { l: '61-90d', v: h.arAgeing.d61_90 }, { l: '90+d', v: h.arAgeing.d90p }].map(b => (
                    <div key={b.l} className="text-center p-2 bg-zinc-50 rounded-lg">
                      <div className="text-[8px] font-bold text-zinc-400 uppercase">{b.l}</div>
                      <div className="text-[10px] font-semibold text-zinc-900">{fmtMoney(b.v)}</div>
                    </div>
                  ))}
                </div>
              </>);
            })() : <p className="text-xs text-zinc-400 italic">Ageing not tracked. Implement 4-bucket tracking for visibility.</p>}
          </HealthCard>

          <HealthCard title="Payables" risk={apRisk}>
            {h.apAgeing ? (() => {
              const total = h.apAgeing.d0_30 + h.apAgeing.d31_60 + h.apAgeing.d61_90 + h.apAgeing.d90p;
              const pct90 = total > 0 ? (h.apAgeing.d90p / total * 100) : 0;
              return (<>
                <p className="text-xs text-zinc-600 mb-2">{fmtNum(pct90, 1)}% of payables beyond 90 days{h.apStrategic ? ' (negotiated terms)' : ''}</p>
                <div className="grid grid-cols-4 gap-1">
                  {[{ l: '0-30d', v: h.apAgeing.d0_30 }, { l: '31-60d', v: h.apAgeing.d31_60 }, { l: '61-90d', v: h.apAgeing.d61_90 }, { l: '90+d', v: h.apAgeing.d90p }].map(b => (
                    <div key={b.l} className="text-center p-2 bg-zinc-50 rounded-lg">
                      <div className="text-[8px] font-bold text-zinc-400 uppercase">{b.l}</div>
                      <div className="text-[10px] font-semibold text-zinc-900">{fmtMoney(b.v)}</div>
                    </div>
                  ))}
                </div>
              </>);
            })() : <p className="text-xs text-zinc-400 italic">Payables ageing not tracked.</p>}
          </HealthCard>
        </div>
      </div>

      {/* 3. Structure */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">3</span> Capital Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard title="Leverage (D/E)" risk={deRisk}>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-semibold text-zinc-900">{h.isDebtFree ? '0' : (h.deRatio != null ? fmtNum(h.deRatio) : '--')}</span>
              <span className="text-base font-bold text-zinc-400">×</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 rounded-lg"><div className="text-[9px] font-bold text-zinc-400 uppercase">Total Debt</div><div className="text-sm font-semibold text-rose-600">{fmtMoney(bs.totalDebt)}</div></div>
              <div className="p-3 bg-zinc-50 rounded-lg"><div className="text-[9px] font-bold text-zinc-400 uppercase">Equity</div><div className="text-sm font-semibold text-emerald-600">{fmtMoney(bs.eq)}</div></div>
            </div>
          </HealthCard>

          <HealthCard title="Interest Coverage" risk={icrRisk}>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-semibold text-zinc-900">{h.isInterestFree ? 'N/A' : (h.icr != null ? fmtNum(h.icr) : '--')}</span>
              {!h.isInterestFree && <span className="text-base font-bold text-zinc-400">×</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 rounded-lg"><div className="text-[9px] font-bold text-zinc-400 uppercase">Op Profit/mo</div><div className="text-sm font-semibold text-zinc-900">{fmtMoney(m.opProfit)}</div></div>
              <div className="p-3 bg-zinc-50 rounded-lg"><div className="text-[9px] font-bold text-zinc-400 uppercase">Interest/mo</div><div className="text-sm font-semibold text-zinc-900">{fmtMoney(m.INTm)}</div></div>
            </div>
            {h.isInterestFree && <p className="text-xs text-emerald-600 font-medium mt-2">Zero interest obligations — all profit retained.</p>}
          </HealthCard>
        </div>

        {/* Debt Freedom */}
        {debtFreedom && debtFreedom.feasible && debtFreedom.scenarios && (
          <Card className="border border-zinc-200  rounded-xl p-6 bg-zinc-900 text-white">
            <h4 className="text-base font-semibold text-zinc-100 mb-4">Debt Freedom Path</h4>
            <p className="text-xs text-zinc-400 mb-4">Total debt: <strong className="text-white">{fmtMoney(debtFreedom.totalDebt)}</strong></p>
            <div className="grid grid-cols-3 gap-3">
              {debtFreedom.scenarios.map((s: any) => (
                <div key={s.pct} className="p-4 bg-white/10 rounded-xl text-center">
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">{s.pct}% of profit</div>
                  <div className="text-lg font-semibold text-teal-400 mt-1">{s.label}</div>
                  <div className="text-[10px] text-zinc-500">{fmtMoney(s.monthly)}/mo</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 4. Concentration */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">4</span> Concentration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard title="Customer Concentration" risk={custRisk}>
            <p className="text-xs text-zinc-600">{h.topCust != null ? `Top customers: ${fmtNum(h.topCust, 1)}% of revenue` : 'Not tracked'}</p>
          </HealthCard>
          <HealthCard title="Supplier Concentration" risk={suppRisk}>
            <p className="text-xs text-zinc-600">{h.topSupp != null ? `Top suppliers: ${fmtNum(h.topSupp, 1)}% of purchases` : 'Not tracked'}</p>
          </HealthCard>
        </div>
      </div>

      {/* 5. Networth */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">5</span> Networth
        </h3>
        <HealthCard title="Real Networth" risk={nwRisk}>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-semibold text-zinc-900">{bs.realNetworth != null ? fmtMoney(bs.realNetworth) : '--'}</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { l: 'Cash', v: bs.cash }, { l: 'Inventory', v: bs.inv }, { l: 'AR', v: bs.ar },
              { l: 'Fixed Assets', v: bs.realisableFA }, { l: 'Liabilities', v: bs.totalLiabilities }, { l: 'Equity', v: bs.eq },
            ].map(x => (
              <div key={x.l} className="p-2 bg-zinc-50 rounded-lg text-center">
                <div className="text-[8px] font-bold text-zinc-400 uppercase">{x.l}</div>
                <div className="text-[10px] font-semibold text-zinc-900">{fmtMoney(x.v)}</div>
              </div>
            ))}
          </div>
        </HealthCard>
      </div>
    </div>
  );
}

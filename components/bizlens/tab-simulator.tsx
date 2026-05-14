'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { fmtMoney, fmtPct, fmtNum } from './fmt';

/** Client-side pure-math simulation — mirrors service logic without importing server modules */
function simScenario(m: any, pcts: { salesPct: number; vcPct: number; fcPct: number }) {
  const Rm = m.Rm * (1 + pcts.salesPct / 100);
  const VCm = m.VCm * (1 + pcts.vcPct / 100);
  const FCm = m.FCm * (1 + pcts.fcPct / 100);
  const contribution = Rm - VCm;
  const cmPct = Rm > 0 ? contribution / Rm : 0;
  const op = contribution - FCm;
  const opPct = Rm > 0 ? op / Rm : 0;
  const be = cmPct > 0 ? FCm / cmPct : 0;
  const mos = Rm - be;
  const mosPct = Rm > 0 ? mos / Rm : 0;
  return { Rm, VCm, FCm, contribution, cmPct, op, opPct, be, mos, mosPct };
}

function projScenario(sim: any, months: number) {
  return { sales: sim.Rm * months, op: sim.op * months, be: sim.be, mos: sim.mos * months, mosPct: sim.mosPct };
}

function calcOptPaths(m: any, targetProfit: number, months: number) {
  const tpm = months > 0 ? targetProfit / months : 0;
  if (m.opProfit >= tpm) return { scenarios: [], reason: 'Target already achieved', targetMonthly: tpm };
  const gap = tpm - m.opProfit;
  const scenarios = [];
  // 1. Revenue Only
  const newSales = m.cmPct > 0 ? m.Rm + gap / m.cmPct : 0;
  const ds = newSales - m.Rm;
  scenarios.push({ id: 1, title: 'Revenue Growth', desc: 'Increase sales keeping margins constant', sales: newSales, vc: m.VCm + ds * (1 - m.cmPct), fc: m.FCm, deltaSales: ds, deltaVC: ds * (1 - m.cmPct), deltaFC: 0, feasible: ds / m.Rm < 0.5 });
  // 2. Cost Reduction
  const newFC = m.FCm - gap;
  scenarios.push({ id: 2, title: 'Cost Cutting', desc: 'Reduce fixed costs only', sales: m.Rm, vc: m.VCm, fc: newFC, deltaSales: 0, deltaVC: 0, deltaFC: newFC - m.FCm, feasible: newFC > 0 });
  // 3. Blended
  const halfGap = gap / 2;
  const blendSales = m.cmPct > 0 ? m.Rm + halfGap / m.cmPct : m.Rm;
  const blendFC = m.FCm - halfGap;
  const blendDS = blendSales - m.Rm;
  scenarios.push({ id: 3, title: 'Balanced Approach', desc: '50% revenue + 50% cost', sales: blendSales, vc: m.VCm + blendDS * (1 - m.cmPct), fc: blendFC, deltaSales: blendDS, deltaVC: blendDS * (1 - m.cmPct), deltaFC: blendFC - m.FCm, feasible: blendFC > 0 && blendDS / m.Rm < 0.5 });
  return { scenarios, reason: '', targetMonthly: tpm };
}

export default function SimulatorTab({ report }: any) {
  if (!report) return null;
  const m = report.monthly;

  const [salesPct, setSalesPct] = useState(0);
  const [vcPct, setVcPct] = useState(0);
  const [fcPct, setFcPct] = useState(0);
  const [showOpt, setShowOpt] = useState(false);

  const sim = simScenario(m, { salesPct, vcPct, fcPct });
  const delta = sim.op - m.opProfit;
  const proj1 = projScenario(sim, 1);
  const proj6 = projScenario(sim, 6);
  const proj12 = projScenario(sim, 12);
  const opt = showOpt ? calcOptPaths(m, report.totals?.TP || m.opProfit * m.M * 1.5, m.M) : null;

  const reset = () => { setSalesPct(0); setVcPct(0); setFcPct(0); };

  return (
    <div className="space-y-6">
      <Card className="border border-zinc-200  rounded-xl overflow-hidden">
        <CardHeader className="p-8 border-b border-zinc-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="tff-section-title">What-If Simulator</CardTitle>
              <CardDescription className="text-sm mt-1">Adjust levers to predict profitability impact</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={reset}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              {[
                { label: 'Sales Growth', val: salesPct, set: setSalesPct, min: -50, max: 100, goodUp: true },
                { label: 'Variable Cost Change', val: vcPct, set: setVcPct, min: -30, max: 30, goodUp: false },
                { label: 'Fixed Cost Change', val: fcPct, set: setFcPct, min: -30, max: 30, goodUp: false },
              ].map(s => (
                <div key={s.label} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-zinc-900">{s.label}</label>
                    <span className={`text-lg font-semibold ${(s.goodUp ? s.val >= 0 : s.val <= 0) ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {s.val > 0 ? '+' : ''}{s.val}%
                    </span>
                  </div>
                  <Slider value={[s.val]} min={s.min} max={s.max} step={1} onValueChange={(v) => s.set(v[0])} />
                </div>
              ))}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => { reset(); setSalesPct(20); }}>Sales +20%</Button>
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => { reset(); setVcPct(-5); }}>Margin +5%</Button>
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => { reset(); setFcPct(-10); }}>Cut 10% FC</Button>
              </div>
            </div>

            <div className="bg-zinc-50 rounded-xl p-8 border border-zinc-100 space-y-6">
              <div className="text-center space-y-2">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Projected Monthly Profit</div>
                <div className={`text-4xl font-semibold ${sim.op >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>{fmtMoney(sim.op)}</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Δ from current:</span>
                  <span className={`text-sm font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{delta >= 0 ? '+' : ''}{fmtMoney(delta)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'New Sales', v: fmtMoney(sim.Rm) }, { l: 'New CM%', v: fmtPct(sim.cmPct) },
                  { l: 'Break-Even', v: fmtMoney(sim.be) }, { l: 'Safety', v: fmtPct(sim.mosPct) },
                ].map(x => (
                  <div key={x.l} className="p-4 bg-white rounded-xl border border-zinc-100">
                    <div className="text-[9px] font-bold text-zinc-400 uppercase">{x.l}</div>
                    <div className="text-base font-semibold text-zinc-900">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projections */}
      <Card className="border border-zinc-200  rounded-xl overflow-hidden">
        <CardHeader className="p-8 pb-0"><CardTitle className="text-lg font-semibold text-zinc-900">Projections</CardTitle></CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-3 gap-4">
            {[{ l: '1 Month', p: proj1 }, { l: '6 Months', p: proj6 }, { l: '12 Months', p: proj12 }].map(({ l, p }) => (
              <div key={l} className="p-5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-3">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{l}</div>
                <div className="space-y-2">
                  {[{ n: 'Sales', v: fmtMoney(p.sales) }, { n: 'Profit', v: fmtMoney(p.op), c: p.op >= 0 ? 'text-emerald-600' : 'text-rose-600' }, { n: 'Safety', v: fmtMoney(p.mos) }].map(x => (
                    <div key={x.n} className="flex justify-between text-xs"><span className="text-zinc-500">{x.n}</span><span className={`font-semibold ${x.c || 'text-zinc-900'}`}>{x.v}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimum Paths */}
      <Card className="border border-zinc-200  rounded-xl overflow-hidden">
        <CardHeader className="p-8 pb-0 flex flex-row justify-between items-center">
          <div><CardTitle className="text-lg font-semibold text-zinc-900">Optimum Paths</CardTitle><CardDescription className="text-sm">Scenarios to hit target profit</CardDescription></div>
          <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => setShowOpt(true)}>Calculate</Button>
        </CardHeader>
        <CardContent className="p-8">
          {!opt ? <p className="text-xs text-zinc-400 italic">Click Calculate to see optimum scenarios.</p> :
            opt.reason === 'Target already achieved' ? <p className="text-xs text-emerald-600 font-bold">✓ Target already achieved!</p> :
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {opt.scenarios.map((sc: any) => (
                <div key={sc.id} className={`p-5 rounded-xl border ${sc.feasible ? 'bg-zinc-50 border-zinc-100' : 'bg-rose-50 border-rose-100 opacity-60'}`}>
                  <div className="text-xs font-semibold text-zinc-900 mb-1">{sc.id}. {sc.title}</div>
                  <div className="text-[10px] text-zinc-500 mb-3">{sc.desc}</div>
                  <div className="space-y-1 text-xs">
                    {[{ n: 'Sales', v: sc.sales, d: sc.deltaSales }, { n: 'VC', v: sc.vc, d: sc.deltaVC }, { n: 'FC', v: sc.fc, d: sc.deltaFC }].map(x => (
                      <div key={x.n} className="flex justify-between"><span>{x.n}</span><span className="font-bold">{fmtMoney(x.v)} <span className="text-zinc-400">({x.d >= 0 ? '+' : ''}{fmtMoney(x.d)})</span></span></div>
                    ))}
                  </div>
                  {!sc.feasible && <div className="text-[10px] text-rose-600 font-bold mt-2">Not Feasible</div>}
                </div>
              ))}
            </div>
          }
          {opt && <p className="text-[10px] text-zinc-400 mt-3">Target: {fmtMoney(opt.targetMonthly)}/mo | Current CM: {fmtPct(m.cmPct)}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

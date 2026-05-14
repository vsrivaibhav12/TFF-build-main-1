import * as bizlensRepo from '@/lib/repositories/bizlens';

// ============================================================================
// BizLens Math Engine — full TypeScript port of legacy /Tool/finance.js
// + /Tool/insights.js
//
// EVERY public function should be deterministic and side-effect free EXCEPT
// the data-operations at the bottom (createReport, updateReport, publishReport).
// ============================================================================

export interface BizlensData {
  id?: string;
  client_id: string;
  period_month?: number | null;
  period_year: number;
  months_covered: number;
  status?: string;

  sales_revenue: number;
  variable_costs: number;
  fixed_costs: number;
  fc_includes_interest: boolean;
  purchases: number;
  interest_expense: number;
  target_profit: number;
  inventory_change: number;
  other_income: number;
  non_cash_expenses: number;

  bs_cash: number;
  bs_inventory: number;
  bs_accounts_receivable: number;
  bs_other_current_assets: number;
  bs_loans_advances: number;
  realisable_fixed_assets: number;

  bs_accounts_payable: number;
  bs_current_liabilities_other: number;
  bs_short_term_borrowings: number;
  bs_long_term_borrowings: number;
  bs_other_liabilities: number;
  bs_equity: number;

  ar_ageing_available: boolean;
  ar_0_30: number;
  ar_31_60: number;
  ar_61_90: number;
  ar_90_plus: number;

  ap_ageing_available: boolean;
  ap_0_30: number;
  ap_31_60: number;
  ap_61_90: number;
  ap_90_plus: number;

  top_customer_pct: number | null;
  top_supplier_pct: number | null;
  direct_materials?: number;
  direct_labor?: number;
  packaging_logistics?: number;
  other_variable?: number;
  rent_lease?: number;
  salaries_fixed?: number;
  utilities?: number;
  marketing?: number;
  admin_general?: number;

  customer_credit_policy?: string;
  supplier_credit_policy?: string;
  wc_intentional: boolean;
  ap_strategic: boolean;
}

export interface BizlensThresholds {
  cashHigh?: number;     // critical below — default 3
  cashGood?: number;     // healthy above — default 6
  wcSalesHigh?: number;  // default 40
  wcSalesMed?: number;   // default 25
  deLow?: number;        // high risk above — default 2
  deHigh?: number;       // low risk below — default 1
  icrHigh?: number;      // critical below — default 1.5
  icrLow?: number;       // comfortable above — default 3
  concHigh?: number;     // default 50
  concMed?: number;      // default 30
}

export const DEFAULT_THRESHOLDS: Required<BizlensThresholds> = {
  cashHigh: 3, cashGood: 6,
  wcSalesHigh: 40, wcSalesMed: 25,
  deLow: 2, deHigh: 1,
  icrHigh: 1.5, icrLow: 3,
  concHigh: 50, concMed: 30,
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const toNum = (v: any): number => {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

// ---------- Formatters ----------
export const fmtMoney = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return 'Rs. --';
  const abs = Math.round(Math.abs(n));
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n >= 0 ? 'Rs. ' : '−Rs. ') + formatted;
};

export const fmtMoneyCompact = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return 'Rs. --';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return sign + 'Rs. ' + (abs / 1e7).toFixed(2) + ' Cr';
  if (abs >= 1e5) return sign + 'Rs. ' + (abs / 1e5).toFixed(2) + ' L';
  if (abs >= 1e3) return sign + 'Rs. ' + (abs / 1e3).toFixed(1) + 'K';
  return sign + 'Rs. ' + Math.round(abs);
};

export const fmtNum = (n: number | null | undefined, d = 0): string => {
  if (n == null || isNaN(n)) return '--';
  if (d > 0) return Number(n).toFixed(d);
  if (Math.abs(n) < 10 && n % 1 !== 0) return Number(n).toFixed(2);
  const rounded = Math.round(n);
  return rounded.toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
};

export const fmtPct = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return '--';
  return (n * 100).toFixed(1) + '%';
};

// ---------- Validation ----------
export function validateInputs(d: BizlensData): string[] {
  const errors: string[] = [];
  if (!d.months_covered || d.months_covered < 1) errors.push('Period must be at least 1 month');
  if (!d.sales_revenue || d.sales_revenue <= 0) errors.push('Sales cannot be zero');
  if (!d.bs_equity || d.bs_equity <= 0) errors.push('Equity cannot be zero');
  if ((d.fixed_costs ?? 0) === 0 && (d.variable_costs ?? 0) === 0) errors.push('Both Fixed and Variable costs cannot be zero');
  if (d.sales_revenue < 0) errors.push('Sales cannot be negative');
  return errors;
}

// ---------- Core report ----------
export interface BizlensReport {
  monthly: {
    M: number; Rm: number; VCm: number; FCm: number; INTm: number;
    contribution: number; cmPct: number; fcPct: number;
    opProfit: number; opPct: number; beSales: number; mos: number; mosPct: number; tpReqSales: number;
  };
  totals: {
    M: number; R: number; VC: number; FC: number; INT: number; PUR: number; TP: number;
    INV: number; OI: number; NC: number; opTotal: number; actualPL: number;
  };
  bs: {
    cash: number; inv: number; ar: number; otherCA: number; loansAdv: number; totalCurrentAssets: number;
    ap: number; clx: number; stb: number; ltb: number; otherLiab: number; totalLiabilities: number; totalDebt: number;
    eq: number; wc: number; wcSalesRatio: number; realNetworth: number; realisableFA: number;
  };
  health: {
    cashRunway: number | null;
    deRatio: number | null;
    icr: number | null;
    arAgeing: { d0_30: number; d31_60: number; d61_90: number; d90p: number } | null;
    apAgeing: { d0_30: number; d31_60: number; d61_90: number; d90p: number } | null;
    topCust: number | null;
    topSupp: number | null;
    stressOutflow: number;
    fcIncludesInterest: boolean;
    wcIntentional: boolean;
    apStrategic: boolean;
    isDebtFree: boolean;
    isInterestFree: boolean;
  };
}

export function computeReport(inputs: BizlensData): BizlensReport {
  const M = Math.max(1, inputs.months_covered || 1);
  const R = inputs.sales_revenue || 0;
  const VC = inputs.variable_costs || 0;
  const FC_raw = inputs.fixed_costs || 0;
  const PUR = inputs.purchases || 0;
  const INT = inputs.interest_expense || 0;
  const TP = inputs.target_profit || 0;
  const INV = inputs.inventory_change || 0;
  const OI = inputs.other_income || 0;
  const NC = inputs.non_cash_expenses || 0;
  const FC_INCLUDES_INT = inputs.fc_includes_interest;

  const FCm = FC_INCLUDES_INT ? FC_raw / M : (FC_raw / M) + (INT / M);
  const VCm = VC / M;
  const Rm = R / M;
  const INTm = INT / M;

  const contribution = Rm - VCm;
  const cmPct = Rm > 0 ? contribution / Rm : 0;
  const fcPct = Rm > 0 ? FCm / Rm : 0;
  const opProfit = contribution - FCm;
  const opPct = Rm > 0 ? opProfit / Rm : 0;

  const beSales = cmPct > 0 ? FCm / cmPct : 0;
  const mos = Rm - beSales;
  const mosPct = Rm > 0 ? mos / Rm : 0;

  const opTotal = opProfit * M;
  const actualPL = opTotal + INV + OI - NC;
  const targetMonthly = TP / M;
  const tpReqSales = cmPct > 0 ? (FCm + targetMonthly) / cmPct : 0;

  const cash = inputs.bs_cash || 0;
  const inv = inputs.bs_inventory || 0;
  const ar = inputs.bs_accounts_receivable || 0;
  const otherCA = inputs.bs_other_current_assets || 0;
  const loansAdv = inputs.bs_loans_advances || 0;
  const ap = inputs.bs_accounts_payable || 0;
  const clx = inputs.bs_current_liabilities_other || 0;
  const stb = inputs.bs_short_term_borrowings || 0;
  const ltb = inputs.bs_long_term_borrowings || 0;
  const otherLiab = inputs.bs_other_liabilities || 0;
  const eq = inputs.bs_equity || 0;
  const realisableFA = inputs.realisable_fixed_assets || 0;

  const totalCurrentAssets = cash + inv + ar + otherCA + loansAdv;
  const totalLiabilities = ap + clx + stb + ltb + otherLiab;
  const totalDebt = stb + ltb;
  const wc = ar + inv - ap;
  const annualizedSales = Rm * 12;
  const wcSalesRatio = annualizedSales > 0 ? (wc / annualizedSales) * 100 : 0;

  const realNetworth = (totalCurrentAssets + realisableFA) - totalLiabilities;
  const deRatio = eq > 0 ? totalDebt / eq : null;
  const icr = INTm > 0 ? opProfit / INTm : null;

  const stressOutflow = FCm;
  const cashRunway = stressOutflow > 0 ? cash / stressOutflow : null;

  const arAgeing = inputs.ar_ageing_available
    ? { d0_30: inputs.ar_0_30 || 0, d31_60: inputs.ar_31_60 || 0, d61_90: inputs.ar_61_90 || 0, d90p: inputs.ar_90_plus || 0 }
    : null;
  const apAgeing = inputs.ap_ageing_available
    ? { d0_30: inputs.ap_0_30 || 0, d31_60: inputs.ap_31_60 || 0, d61_90: inputs.ap_61_90 || 0, d90p: inputs.ap_90_plus || 0 }
    : null;

  const topCust = inputs.top_customer_pct ?? null;
  const topSupp = inputs.top_supplier_pct ?? null;
  const wcIntentional = !!inputs.wc_intentional;
  const apStrategic = !!inputs.ap_strategic;
  const isDebtFree = (stb + ltb) === 0;
  const isInterestFree = INT === 0;

  return {
    monthly: { M, Rm, VCm, FCm, INTm, contribution, cmPct, fcPct, opProfit, opPct, beSales, mos, mosPct, tpReqSales },
    totals: { M, R, VC, FC: FCm * M, INT, PUR, TP, INV, OI, NC, opTotal, actualPL },
    bs: { cash, inv, ar, otherCA, loansAdv, totalCurrentAssets, ap, clx, stb, ltb, otherLiab, totalLiabilities, totalDebt, eq, wc, wcSalesRatio, realNetworth, realisableFA },
    health: { cashRunway, deRatio, icr, arAgeing, apAgeing, topCust, topSupp, stressOutflow, fcIncludesInterest: FC_INCLUDES_INT, wcIntentional, apStrategic, isDebtFree, isInterestFree },
  };
}

// ---------- Risk assessment ----------
export type RiskLevel = 'good' | 'medium' | 'bad' | 'neutral';
export interface Risk { level: RiskLevel; label: string }
export type RiskType = 'cashRunway' | 'wcSales' | 'deRatio' | 'icr' | 'concentration' | 'arAgeing' | 'apAgeing' | 'ageing' | 'networth' | 'profit' | 'mos';

export function assessRisk(value: any, thresholds: BizlensThresholds | undefined, type: RiskType, extra?: any): Risk {
  const thr = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  if (type === 'cashRunway') {
    if (value == null) return { level: 'medium', label: 'N/A' };
    if (value < thr.cashHigh) return { level: 'bad', label: 'Critical' };
    if (value < thr.cashGood) return { level: 'medium', label: 'Watch' };
    return { level: 'good', label: 'Healthy' };
  }
  if (type === 'wcSales') {
    if (value == null) return { level: 'medium', label: 'N/A' };
    const wc = extra?.wc, wcIntentional = extra?.wcIntentional;
    if (wc != null && wc < 0) return wcIntentional ? { level: 'good', label: 'Strategic' } : { level: 'bad', label: 'Liquidity Risk' };
    if (value > thr.wcSalesHigh) return { level: 'bad', label: 'High' };
    if (value > thr.wcSalesMed) return { level: 'medium', label: 'Elevated' };
    return { level: 'good', label: 'Normal' };
  }
  if (type === 'deRatio') {
    if (value == null) { if (extra?.isDebtFree) return { level: 'good', label: 'Debt-Free' }; return { level: 'medium', label: 'N/A' }; }
    if (value > thr.deLow) return { level: 'bad', label: 'High Risk' };
    if (value > thr.deHigh) return { level: 'medium', label: 'Moderate' };
    return { level: 'good', label: 'Low Risk' };
  }
  if (type === 'icr') {
    if (value == null) { if (extra?.isInterestFree) return { level: 'good', label: 'Debt-Free' }; return { level: 'medium', label: 'N/A' }; }
    if (value < thr.icrHigh) return { level: 'bad', label: 'Poor' };
    if (value < thr.icrLow) return { level: 'medium', label: 'Adequate' };
    return { level: 'good', label: 'Strong' };
  }
  if (type === 'concentration') {
    if (value == null) return { level: 'medium', label: 'Not Tracked' };
    if (value > thr.concHigh) return { level: 'bad', label: 'High Risk' };
    if (value > thr.concMed) return { level: 'medium', label: 'Moderate' };
    return { level: 'good', label: 'Diversified' };
  }
  if (type === 'arAgeing') {
    if (!value) return { level: 'neutral', label: 'Not Tracked' };
    const total = value.d0_30 + value.d31_60 + value.d61_90 + value.d90p;
    if (total === 0) return { level: 'neutral', label: 'No Data' };
    const pct90 = (value.d90p / total) * 100;
    const pct60 = (value.d61_90 / total) * 100;
    if (pct90 > 20) return { level: 'bad', label: 'High Risk' };
    if (pct90 > 10 || pct60 > 25) return { level: 'medium', label: 'Elevated' };
    return { level: 'good', label: 'Healthy' };
  }
  if (type === 'apAgeing') {
    if (!value) return { level: 'neutral', label: 'Not Tracked' };
    const total = value.d0_30 + value.d31_60 + value.d61_90 + value.d90p;
    if (total === 0) return { level: 'neutral', label: 'No Data' };
    const pct90 = (value.d90p / total) * 100;
    const apStrategic = extra?.apStrategic;
    if (pct90 > 30) return apStrategic ? { level: 'medium', label: 'Extended Terms' } : { level: 'bad', label: 'Overdue Risk' };
    if (pct90 > 15) return apStrategic ? { level: 'good', label: 'Negotiated' } : { level: 'medium', label: 'Watch' };
    return { level: 'good', label: 'Current' };
  }
  if (type === 'networth') {
    if (value == null) return { level: 'medium', label: 'N/A' };
    const equity = extra?.equity || 0;
    if (value <= 0) return { level: 'bad', label: 'Negative' };
    if (equity <= 0) return { level: 'good', label: 'Positive' };
    const ratio = ((value - equity) / equity) * 100;
    if (value < equity * 0.975) return { level: 'bad', label: 'Below Equity' };
    if (value <= equity * 1.025) return { level: 'medium', label: 'At Par' };
    if (ratio < 25) return { level: 'good', label: 'Modest Growth' };
    if (ratio < 50) return { level: 'good', label: 'Healthy Growth' };
    return { level: 'good', label: 'Strong Growth' };
  }
  if (type === 'profit') {
    if (value == null) return { level: 'medium', label: 'N/A' };
    if (value < 0) return { level: 'bad', label: 'Loss' };
    if (value < 0.05) return { level: 'medium', label: 'Thin' };
    return { level: 'good', label: 'Healthy' };
  }
  if (type === 'mos') {
    if (value == null) return { level: 'medium', label: 'N/A' };
    if (value < 0) return { level: 'bad', label: 'Below BE' };
    if (value < 0.10) return { level: 'medium', label: 'Low' };
    return { level: 'good', label: 'Safe' };
  }
  return { level: 'medium', label: '—' };
}

// ---------- Working Capital Cycle ----------
export interface WCCycle {
  dso: number; dio: number; dpo: number; ccc: number;
  cashLockedInCycle: number;
  wcFinancingCost: number;
  monthlyWCCost: number;
  efficiencyScore: number;
  scenarios: { dsoMinus5: number; dsoMinus10: number; dioMinus5: number; dpoPlus5: number };
  dailySales: number;
  annualSales: number; annualCOGS: number; annualPurchases: number;
}

export function computeWCCycle(report: BizlensReport, extraInputs?: { INTm: number }): WCCycle | null {
  if (!report) return null;
  const { monthly: m, totals: t, bs } = report;
  const annualSales = m.Rm * 12;
  const annualCOGS = m.VCm * 12;
  const annualPurchases = t.PUR > 0 ? (t.PUR / t.M) * 12 : annualCOGS;
  const dso = annualSales > 0 ? (bs.ar / annualSales) * 365 : 0;
  const dio = annualCOGS > 0 ? (bs.inv / annualCOGS) * 365 : 0;
  const dpo = annualPurchases > 0 ? (bs.ap / annualPurchases) * 365 : 0;
  const ccc = dso + dio - dpo;
  const dailySales = annualSales / 365;
  const cashLockedInCycle = ccc * dailySales;
  const totalDebt = (bs.stb || 0) + (bs.ltb || 0);
  const monthlyInterest = extraInputs?.INTm ?? 0;
  const actualRate = (totalDebt > 0 && monthlyInterest > 0) ? (monthlyInterest * 12) / totalDebt : 0.12;
  const wcFinancingCost = Math.max(0, cashLockedInCycle) * actualRate;
  const monthlyWCCost = wcFinancingCost / 12;
  const dsoReduction5 = dailySales * 5, dsoReduction10 = dailySales * 10;
  const dailyCOGS = annualCOGS / 365;
  const dioReduction5 = dailyCOGS * 5;
  const dailyPurchases = annualPurchases / 365;
  const dpoIncrease5 = dailyPurchases * 5;
  let efficiencyScore;
  if (ccc <= 0) efficiencyScore = 100;
  else if (ccc <= 30) efficiencyScore = 85;
  else if (ccc <= 60) efficiencyScore = 65;
  else if (ccc <= 90) efficiencyScore = 45;
  else efficiencyScore = Math.max(10, 45 - (ccc - 90) * 0.3);
  return {
    dso: Math.round(dso), dio: Math.round(dio), dpo: Math.round(dpo), ccc: Math.round(ccc),
    cashLockedInCycle: Math.round(cashLockedInCycle),
    wcFinancingCost: Math.round(wcFinancingCost),
    monthlyWCCost: Math.round(monthlyWCCost),
    efficiencyScore: Math.round(efficiencyScore),
    scenarios: {
      dsoMinus5: Math.round(dsoReduction5),
      dsoMinus10: Math.round(dsoReduction10),
      dioMinus5: Math.round(dioReduction5),
      dpoPlus5: Math.round(dpoIncrease5),
    },
    dailySales: Math.round(dailySales),
    annualSales, annualCOGS, annualPurchases,
  };
}

// ---------- Scenario simulation ----------
export interface SimChanges { salesAbs?: number; salesPct?: number; vcAbs?: number; vcPct?: number; fcAbs?: number; fcPct?: number }
export interface SimResult {
  Rm: number; VCm: number; FCm: number;
  contribution: number; cmPct: number;
  op: number; opPct: number;
  be: number; mos: number; mosPct: number;
  totalSales: number;
  bsImpact: BSImpact | null;
}
export interface BSImpact {
  salesGrowthPct: number;
  estARChange: number; estInvChange: number; estAPChange: number;
  currentWC: number; newWC: number; wcChange: number;
  cashFlowImpact: number;
  additionalDebtNeeded: number;
  interestOnNewDebt: number;
  adjustedOp: number;
  newAR: number; newInv: number; newAP: number;
  actualRate: number;
  retainedProfit: number;
  currentEquity: number; newEquity: number;
  currentDE: number | null; newDE: number | null;
  newCash: number; newCashRunway: number | null;
}

export function simulateScenario(
  baseMonthly: BizlensReport['monthly'],
  changes: SimChanges,
  months: number,
  baseBS?: BizlensReport['bs'],
  extraInputs?: { INTm: number },
): SimResult {
  const M = Math.max(1, months || 12);
  let Rm = baseMonthly.Rm;
  if (changes.salesAbs) Rm += changes.salesAbs;
  if (changes.salesPct) Rm = Rm * (1 + changes.salesPct / 100);
  let VCm = baseMonthly.VCm;
  if (changes.vcAbs) VCm += changes.vcAbs;
  if (changes.vcPct) VCm = VCm * (1 + changes.vcPct / 100);
  let FCm = baseMonthly.FCm;
  if (changes.fcAbs) FCm += changes.fcAbs;
  if (changes.fcPct) FCm = FCm * (1 + changes.fcPct / 100);
  const contribution = Rm - VCm;
  const cmPct = Rm > 0 ? contribution / Rm : 0;
  const op = contribution - FCm;
  const opPct = Rm > 0 ? op / Rm : 0;
  const be = cmPct > 0 ? FCm / cmPct : 0;
  const mos = Rm - be;
  const mosPct = Rm > 0 ? mos / Rm : 0;

  let bsImpact: BSImpact | null = null;
  if (baseBS && baseMonthly.Rm > 0) {
    const salesGrowthPct = (Rm - baseMonthly.Rm) / baseMonthly.Rm;
    const vcGrowthPct = baseMonthly.VCm > 0 ? (VCm - baseMonthly.VCm) / baseMonthly.VCm : 0;
    const estARChange = baseBS.ar * salesGrowthPct;
    const estInvChange = baseBS.inv * vcGrowthPct;
    const estAPChange = baseBS.ap * salesGrowthPct;
    const currentWC = baseBS.ar + baseBS.inv - baseBS.ap;
    const newAR = baseBS.ar + estARChange;
    const newInv = baseBS.inv + estInvChange;
    const newAP = baseBS.ap + estAPChange;
    const newWC = newAR + newInv - newAP;
    const wcChange = newWC - currentWC;
    const additionalProfit = (op - baseMonthly.opProfit) * M;
    const cashFlowImpact = additionalProfit - wcChange;
    const totalDebt = (baseBS.stb || 0) + (baseBS.ltb || 0);
    const monthlyInterest = extraInputs?.INTm ?? 0;
    const actualRate = (totalDebt > 0 && monthlyInterest > 0) ? (monthlyInterest * 12) / totalDebt : 0.12;
    const cashAvailable = baseBS.cash + additionalProfit;
    const additionalDebtNeeded = wcChange > cashAvailable ? wcChange - cashAvailable : 0;
    const interestOnNewDebt = additionalDebtNeeded * actualRate / 12;
    const adjustedOp = op - interestOnNewDebt;
    const retainedProfit = additionalProfit;
    const newEquity = baseBS.eq + retainedProfit;
    const newTotalDebt = totalDebt + additionalDebtNeeded;
    const currentDE = baseBS.eq > 0 ? totalDebt / baseBS.eq : null;
    const newDE = newEquity > 0 ? newTotalDebt / newEquity : null;
    const newCash = baseBS.cash + cashFlowImpact;
    const newCashRunway = FCm > 0 ? Math.max(0, newCash) / FCm : null;
    bsImpact = {
      salesGrowthPct,
      estARChange: Math.round(estARChange),
      estInvChange: Math.round(estInvChange),
      estAPChange: Math.round(estAPChange),
      currentWC: Math.round(currentWC),
      newWC: Math.round(newWC),
      wcChange: Math.round(wcChange),
      cashFlowImpact: Math.round(cashFlowImpact),
      additionalDebtNeeded: Math.round(additionalDebtNeeded),
      interestOnNewDebt: Math.round(interestOnNewDebt),
      adjustedOp: Math.round(adjustedOp),
      newAR: Math.round(newAR),
      newInv: Math.round(newInv),
      newAP: Math.round(newAP),
      actualRate,
      retainedProfit: Math.round(retainedProfit),
      currentEquity: Math.round(baseBS.eq),
      newEquity: Math.round(newEquity),
      currentDE, newDE,
      newCash: Math.round(newCash), newCashRunway,
    };
  }

  return { Rm, VCm, FCm, contribution, cmPct, op, opPct, be, mos, mosPct, totalSales: Rm * M, bsImpact };
}

export function projectScenario(scenario: SimResult | null, months: number) {
  if (!scenario) return null;
  return { sales: scenario.Rm * months, op: scenario.op * months, mos: scenario.mos * months, be: scenario.be, mosPct: scenario.mosPct };
}

// ---------- Optimum scenarios to hit target profit ----------
export interface OptimumScenario {
  id: number;
  title: string;
  desc: string;
  sales: number; vc: number; fc: number;
  deltaSales: number; deltaVC: number; deltaFC: number;
  feasible: boolean;
  newCM?: number;
}
export interface OptimumResult {
  feasible: boolean;
  reason: string | null;
  targetMonthly: number;
  scenarios: OptimumScenario[];
}

export function calcOptimumScenarios(baseMonthly: BizlensReport['monthly'], targetProfit: number, months: number): OptimumResult {
  const M = Math.max(1, months || 12);
  const targetMonthly = targetProfit / M;
  const baseOp = baseMonthly.opProfit;
  const gap = targetMonthly - baseOp;
  if (gap <= 0) return { feasible: true, reason: 'Target already achieved', targetMonthly, scenarios: [] };
  const scenarios: OptimumScenario[] = [];
  const baseCM = baseMonthly.cmPct;
  if (baseCM > 0) {
    const salesIncrease = gap / baseCM;
    const newSales = baseMonthly.Rm + salesIncrease;
    scenarios.push({
      id: 1, title: 'Increase Sales',
      desc: 'Grow revenue while maintaining current cost structure',
      sales: newSales, vc: baseMonthly.VCm, fc: baseMonthly.FCm,
      deltaSales: salesIncrease, deltaVC: 0, deltaFC: 0,
      feasible: true, newCM: baseCM,
    });
  }
  if (baseMonthly.VCm > 0 && baseMonthly.Rm > 0) {
    const vcReduction = gap;
    const newVC = Math.max(0, baseMonthly.VCm - vcReduction);
    const newCM = baseMonthly.Rm > 0 ? (baseMonthly.Rm - newVC) / baseMonthly.Rm : 0;
    scenarios.push({
      id: 2, title: 'Reduce Variable Costs',
      desc: 'Improve margins through procurement efficiency',
      sales: baseMonthly.Rm, vc: newVC, fc: baseMonthly.FCm,
      deltaSales: 0, deltaVC: -vcReduction, deltaFC: 0,
      feasible: newVC >= 0, newCM,
    });
  }
  scenarios.push({
    id: 3, title: 'Balanced Approach',
    desc: 'Moderate sales growth + cost optimization',
    sales: baseMonthly.Rm * 1.1, vc: baseMonthly.VCm * 0.95, fc: baseMonthly.FCm * 0.98,
    deltaSales: baseMonthly.Rm * 0.1, deltaVC: -baseMonthly.VCm * 0.05, deltaFC: -baseMonthly.FCm * 0.02,
    feasible: true,
  });
  return { feasible: scenarios.length > 0, reason: scenarios.length === 0 ? 'Cannot achieve target with current structure' : null, targetMonthly, scenarios };
}

// ---------- Break-even days ----------
export interface BreakEvenDays {
  beDays: number; profitDays: number; freedomDay: number; beRatio: number;
  dailySales: number; dailyProfit: number; narrative: string; isLoss: boolean;
}
export function computeBreakEvenDays(report: BizlensReport): BreakEvenDays | null {
  if (!report) return null;
  const { monthly: m } = report;
  if (m.Rm <= 0 || m.beSales <= 0) return null;
  const beRatio = Math.min(1.5, m.beSales / m.Rm);
  const beDays = Math.min(30, Math.round(beRatio * 30));
  const profitDays = Math.max(0, 30 - beDays);
  const freedomDay = Math.min(31, beDays + 1);
  const dailySales = m.Rm / 30;
  const dailyProfit = m.opProfit / 30;
  let narrative = '';
  if (beDays >= 30) narrative = "The business doesn't break even within the month. Revenue needs to increase or costs need to come down.";
  else if (beDays >= 25) narrative = `Only ${profitDays} days generate profit. A small disruption could push into loss.`;
  else if (beDays >= 20) narrative = `Costs are covered by the ${beDays}th. ${profitDays} days of profit — reasonable but improvable.`;
  else if (beDays >= 15) narrative = `Costs covered by mid-month. ${profitDays} profit days gives a healthy safety margin.`;
  else narrative = `Excellent — costs covered by day ${beDays}. More than half the month generates pure profit.`;
  return { beDays, profitDays, freedomDay, beRatio, dailySales: Math.round(dailySales), dailyProfit: Math.round(dailyProfit), narrative, isLoss: m.opProfit <= 0 };
}

// ---------- Debt freedom date ----------
export interface DebtFreedom {
  feasible: boolean; reason?: string; totalDebt: number; monthlyProfit?: number;
  scenarios?: { pct: number; monthly: number; months: number; years: number; rem: number; date: string; label: string }[];
}
export function computeDebtFreedom(report: BizlensReport): DebtFreedom | null {
  if (!report) return null;
  const { monthly: m, bs, health: h } = report;
  if (h.isDebtFree || bs.totalDebt <= 0) return null;
  if (m.opProfit <= 0) return { feasible: false, reason: 'Business is not profitable — debt repayment requires positive operating profit.', totalDebt: bs.totalDebt };
  return {
    feasible: true,
    totalDebt: bs.totalDebt,
    monthlyProfit: m.opProfit,
    scenarios: [10, 25, 50].map((pct) => {
      const monthly = m.opProfit * (pct / 100);
      const months = monthly > 0 ? Math.ceil(bs.totalDebt / monthly) : Infinity;
      const dt = new Date(); dt.setMonth(dt.getMonth() + months);
      return {
        pct, monthly: Math.round(monthly), months,
        years: Math.floor(months / 12), rem: months % 12,
        date: dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        label: Math.floor(months / 12) > 0 ? `${Math.floor(months / 12)}y ${months % 12}m` : `${months % 12} months`,
      };
    }),
  };
}

// ---------- Opportunities ----------
export interface Opportunity { text: string; type: 'wc' | 'margin' | 'cost' | 'growth' | 'risk' }
export function generateOpportunities(report: BizlensReport): Opportunity[] {
  if (!report) return [];
  const { monthly: m, health: h } = report;
  const opps: Opportunity[] = [];
  const wcc = computeWCCycle(report, { INTm: m.INTm });
  if (wcc && wcc.dso > 15) opps.push({ text: `Collect 5 days faster → frees ${fmtMoneyCompact(wcc.scenarios.dsoMinus5)}`, type: 'wc' });
  if (wcc && wcc.dio > 10) opps.push({ text: `Reduce inventory by 5 days → frees ${fmtMoneyCompact(wcc.scenarios.dioMinus5)}`, type: 'wc' });
  if (m.cmPct < 0.30 && m.VCm > 0) {
    const target = m.Rm * 0.03;
    opps.push({ text: `Improve CM by 3% → +${fmtMoneyCompact(target)}/mo`, type: 'margin' });
  }
  if (m.fcPct > 0.25) {
    const saving = m.FCm * 0.05;
    opps.push({ text: `Cut fixed costs 5% → saves ${fmtMoneyCompact(saving)}/mo`, type: 'cost' });
  }
  if (m.mosPct < 0.15 && m.mosPct >= 0) opps.push({ text: 'Grow sales 10% → widens safety margin', type: 'growth' });
  if (h.topCust != null && h.topCust > 50) opps.push({ text: 'Diversify customer base to reduce concentration risk', type: 'risk' });
  if (wcc && wcc.dpo < 20) opps.push({ text: `Negotiate 5 more days to pay → frees ${fmtMoneyCompact(wcc.scenarios.dpoPlus5)}`, type: 'wc' });
  return opps.slice(0, 5);
}

// ---------- BizLens Score (0-1000) ----------
export interface BizLensScore {
  total: number;
  scores: { liquidity: number; discipline: number; structure: number; concentration: number; networth: number };
  band: 'Elite Operations' | 'Strong Operations' | 'Needs Improvement' | 'At Risk' | 'Critical';
  bandColor: 'elite' | 'strong' | 'improve' | 'atrisk' | 'critical';
  max: 1000;
}
export function computeBizLensScore(report: BizlensReport, thresholds?: BizlensThresholds): BizLensScore | null {
  if (!report) return null;
  const { health: h, bs } = report;
  const scores: any = {};
  const cr = h.cashRunway;
  let liq = 0;
  if (cr != null) {
    if (cr >= 6) liq = 250;
    else if (cr >= 3) liq = 180 + (cr - 3) / 3 * 70;
    else if (cr >= 1) liq = 100 + (cr - 1) / 2 * 80;
    else if (cr > 0) liq = cr * 100;
  }
  const wcRatio = bs.wcSalesRatio;
  if (wcRatio != null && wcRatio > 0 && wcRatio < 25) liq = Math.min(250, liq + 20);
  else if (wcRatio != null && wcRatio > 50) liq = Math.max(0, liq - 30);
  scores.liquidity = Math.round(clamp(liq, 0, 250));

  let disc = 100;
  if (h.arAgeing) {
    const total = h.arAgeing.d0_30 + h.arAgeing.d31_60 + h.arAgeing.d61_90 + h.arAgeing.d90p;
    if (total > 0) {
      const pct90 = h.arAgeing.d90p / total;
      disc += (pct90 < 0.05 ? 50 : pct90 < 0.10 ? 30 : pct90 < 0.20 ? 10 : -30);
    }
  } else disc -= 20;
  if (h.apAgeing) {
    const total = h.apAgeing.d0_30 + h.apAgeing.d31_60 + h.apAgeing.d61_90 + h.apAgeing.d90p;
    if (total > 0) {
      const pct90 = h.apAgeing.d90p / total;
      disc += (pct90 < 0.10 ? 30 : pct90 < 0.20 ? 15 : -10);
    }
  } else disc -= 10;
  scores.discipline = Math.round(clamp(disc, 0, 200));

  let struct = 0;
  if (h.isDebtFree) struct = 180;
  else if (h.deRatio != null) {
    if (h.deRatio <= 0.5) struct = 160;
    else if (h.deRatio <= 1) struct = 130;
    else if (h.deRatio <= 2) struct = 90;
    else if (h.deRatio <= 3) struct = 60;
    else if (h.deRatio <= 5) struct = 30;
    else struct = 10;
  } else struct = 80;
  if (h.icr != null) {
    if (h.icr >= 5) struct += 40;
    else if (h.icr >= 3) struct += 25;
    else if (h.icr >= 1.5) struct += 10;
    else struct -= 10;
  } else if (h.isInterestFree) struct += 20;
  scores.structure = Math.round(clamp(struct, 0, 200));

  let conc = 75;
  if (h.topCust != null) {
    if (h.topCust <= 20) conc += 40;
    else if (h.topCust <= 30) conc += 25;
    else if (h.topCust <= 50) conc += 0;
    else conc -= 25;
  }
  if (h.topSupp != null) {
    if (h.topSupp <= 25) conc += 25;
    else if (h.topSupp <= 40) conc += 10;
    else conc -= 10;
  }
  scores.concentration = Math.round(clamp(conc, 0, 150));

  let nw = 0;
  const realNW = bs.realNetworth, eq = bs.eq;
  if (realNW != null && realNW > 0) {
    nw = 80;
    if (eq > 0) {
      const growthPct = ((realNW - eq) / eq) * 100;
      if (growthPct > 50) nw = 200;
      else if (growthPct > 25) nw = 160;
      else if (growthPct > 0) nw = 120;
      else if (growthPct > -10) nw = 80;
      else nw = 40;
    }
  } else if (realNW != null && realNW <= 0) nw = 10;
  scores.networth = Math.round(clamp(nw, 0, 200));

  const total = scores.liquidity + scores.discipline + scores.structure + scores.concentration + scores.networth;
  let band: BizLensScore['band'], bandColor: BizLensScore['bandColor'];
  if (total >= 800) { band = 'Elite Operations'; bandColor = 'elite'; }
  else if (total >= 650) { band = 'Strong Operations'; bandColor = 'strong'; }
  else if (total >= 450) { band = 'Needs Improvement'; bandColor = 'improve'; }
  else if (total >= 250) { band = 'At Risk'; bandColor = 'atrisk'; }
  else { band = 'Critical'; bandColor = 'critical'; }
  return { total, scores, band, bandColor, max: 1000 };
}

// ---------- Trends across periods ----------
export interface TrendDirection { pct: number; dir: 'up' | 'down' | 'flat' }
export interface TrendAnalysis {
  periods: number;
  labels: string[];
  data: { sales: number[]; vc: number[]; fc: number[]; profit: number[]; cmPct: number[]; be: number[] };
  directions: { sales: TrendDirection; profit: TrendDirection; cm: TrendDirection; fc: TrendDirection };
  keyInsights: { type: 'good' | 'warn' | 'bad'; text: string }[];
  healthInsights: { type: 'good' | 'warn' | 'bad'; text: string }[];
}
export function computeTrends(currentReport: BizlensReport, priorPeriods: BizlensReport[]): TrendAnalysis | null {
  if (!priorPeriods || priorPeriods.length === 0) return null;
  const current = currentReport.monthly;
  const periods = [current, ...priorPeriods.map((p) => p.monthly)];
  const labels = ['Current'];
  priorPeriods.forEach((_, i) => labels.push('Month -' + (i + 1)));
  const salesTrend = periods.map((p) => p.Rm);
  const vcTrend = periods.map((p) => p.VCm);
  const fcTrend = periods.map((p) => p.FCm);
  const profitTrend = periods.map((p) => p.opProfit);
  const cmPctTrend = periods.map((p) => p.cmPct);
  const beTrend = periods.map((p) => p.beSales);
  const oldest = periods[periods.length - 1];
  const direction = (curr: number, old: number): TrendDirection => {
    if (old === 0) return { pct: 0, dir: 'flat' };
    const pct = ((curr - old) / Math.abs(old)) * 100;
    return { pct: Math.round(pct * 10) / 10, dir: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat' };
  };
  const salesDir = direction(current.Rm, oldest.Rm);
  const profitDir = direction(current.opProfit, oldest.opProfit);
  const cmDir = direction(current.cmPct, oldest.cmPct);
  const fcDir = direction(current.FCm, oldest.FCm);
  const keyInsights: TrendAnalysis['keyInsights'] = [];
  if (salesDir.dir === 'up' && profitDir.dir === 'down') keyInsights.push({ type: 'warn', text: 'Sales growing but profit declining — margins are compressing.' });
  if (salesDir.dir === 'down' && salesDir.pct < -5) keyInsights.push({ type: 'bad', text: `Revenue declining ${Math.abs(salesDir.pct)}% over the period.` });
  if (profitDir.dir === 'up' && profitDir.pct > 10) keyInsights.push({ type: 'good', text: `Profit improved ${profitDir.pct}% — positive trajectory.` });
  if (fcDir.dir === 'up' && fcDir.pct > 5) keyInsights.push({ type: 'warn', text: `Fixed costs rising ${fcDir.pct}% — monitor cost discipline.` });
  if (cmDir.dir === 'down') keyInsights.push({ type: 'warn', text: 'Contribution margin declining — pricing or cost pressure.' });
  const healthInsights: TrendAnalysis['healthInsights'] = [];
  const priorH: any = (priorPeriods[0] as any)?.health;
  const currH: any = currentReport.health;
  if (priorH) {
    if (currH.cashRunway != null && priorH.cashRunway != null) {
      if (currH.cashRunway < priorH.cashRunway) healthInsights.push({ type: 'warn', text: `Cash runway decreased from ${fmtNum(priorH.cashRunway, 1)} to ${fmtNum(currH.cashRunway, 1)} months.` });
      else if (currH.cashRunway > priorH.cashRunway) healthInsights.push({ type: 'good', text: `Cash runway improved to ${fmtNum(currH.cashRunway, 1)} months.` });
    }
    if (currH.deRatio != null && priorH.deRatio != null) {
      if (currH.deRatio > priorH.deRatio + 0.3) healthInsights.push({ type: 'warn', text: `Leverage increased from ${fmtNum(priorH.deRatio, 1)}× to ${fmtNum(currH.deRatio, 1)}×.` });
      else if (currH.deRatio < priorH.deRatio - 0.3) healthInsights.push({ type: 'good', text: `Leverage improved to ${fmtNum(currH.deRatio, 1)}×.` });
    }
  }
  return {
    periods: periods.length,
    labels: labels.reverse(),
    data: { sales: salesTrend.reverse(), vc: vcTrend.reverse(), fc: fcTrend.reverse(), profit: profitTrend.reverse(), cmPct: cmPctTrend.reverse(), be: beTrend.reverse() },
    directions: { sales: salesDir, profit: profitDir, cm: cmDir, fc: fcDir },
    keyInsights, healthInsights,
  };
}

// ---------- Monte Carlo simulation ----------
export interface MonteCarloVariances { salesMin: number; salesMax: number; vcMin: number; vcMax: number; fcMin: number; fcMax: number }
export interface MonteCarloResult {
  results: number[];
  p5: number; p50: number; p95: number; mean: number; min: number; max: number;
  bins: { lo: number; hi: number; count: number; label: string }[];
  lossProbability: number;
  iterations: number;
}
export function runMonteCarlo(baseMonthly: BizlensReport['monthly'], variances: MonteCarloVariances, iterations = 1000): MonteCarloResult {
  const results: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const salesVar = variances.salesMin + Math.random() * (variances.salesMax - variances.salesMin);
    const vcVar = variances.vcMin + Math.random() * (variances.vcMax - variances.vcMin);
    const fcVar = variances.fcMin + Math.random() * (variances.fcMax - variances.fcMin);
    const Rm = baseMonthly.Rm * (1 + salesVar / 100);
    const VCm = baseMonthly.VCm * (1 + vcVar / 100);
    const FCm = baseMonthly.FCm * (1 + fcVar / 100);
    const op = (Rm - VCm) - FCm;
    results.push(Math.round(op));
  }
  results.sort((a, b) => a - b);
  const percentile = (arr: number[], p: number) => {
    const idx = Math.floor(arr.length * p / 100);
    return arr[Math.min(idx, arr.length - 1)];
  };
  const min = results[0], max = results[results.length - 1];
  const range = max - min || 1;
  const binCount = Math.min(20, Math.max(8, Math.ceil(Math.sqrt(iterations))));
  const binWidth = range / binCount;
  const bins = [] as MonteCarloResult['bins'];
  for (let i = 0; i < binCount; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    const count = results.filter((r) => r >= lo && (i === binCount - 1 ? r <= hi : r < hi)).length;
    bins.push({ lo: Math.round(lo), hi: Math.round(hi), count, label: fmtMoney(Math.round((lo + hi) / 2)) });
  }
  const lossCount = results.filter((r) => r < 0).length;
  const lossProbability = Math.round((lossCount / iterations) * 100);
  return {
    results,
    p5: percentile(results, 5),
    p50: percentile(results, 50),
    p95: percentile(results, 95),
    mean: Math.round(results.reduce((a, b) => a + b, 0) / results.length),
    min, max, bins, lossProbability, iterations,
  };
}

// ---------- Future projections via linear regression ----------
export interface RegressionResult { slope: number; intercept: number; r2: number; predict: (x: number) => number }
export function linearRegression(values: number[]): RegressionResult | null {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += values[i]; sumXY += i * values[i]; sumXX += i * i; }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssTot += (values[i] - meanY) ** 2;
    ssRes += (values[i] - predicted) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2, predict: (x) => intercept + slope * x };
}

export interface FutureProjection {
  projections: { period: string; sales: number; profit: number | null; cmPct: number | null; fc: number | null }[];
  confidence: { sales: number; profit: number | null };
  historical: { labels: string[]; sales: number[]; profit: number[] };
}
export function computeFutureProjections(currentReport: BizlensReport, priorReports: BizlensReport[]): FutureProjection | null {
  if (!priorReports || priorReports.length < 2) return null;
  const allReports = [...priorReports, currentReport];
  const n = allReports.length;
  const salesSeries = allReports.map((r) => r.monthly.Rm);
  const profitSeries = allReports.map((r) => r.monthly.opProfit);
  const cmSeries = allReports.map((r) => r.monthly.cmPct * 100);
  const fcSeries = allReports.map((r) => r.monthly.FCm);
  const salesReg = linearRegression(salesSeries);
  const profitReg = linearRegression(profitSeries);
  const cmReg = linearRegression(cmSeries);
  const fcReg = linearRegression(fcSeries);
  if (!salesReg) return null;
  const projections = [1, 2, 3].map((offset) => {
    const idx = n - 1 + offset;
    return {
      period: '+' + offset + ' mo',
      sales: Math.round(salesReg.predict(idx)),
      profit: profitReg ? Math.round(profitReg.predict(idx)) : null,
      cmPct: cmReg ? cmReg.predict(idx) / 100 : null,
      fc: fcReg ? Math.round(fcReg.predict(idx)) : null,
    };
  });
  return {
    projections,
    confidence: { sales: salesReg.r2, profit: profitReg ? profitReg.r2 : null },
    historical: {
      labels: allReports.map((_, i) => i < priorReports.length ? 'Month -' + (priorReports.length - i) : 'Current'),
      sales: salesSeries, profit: profitSeries,
    },
  };
}

// ---------- Detailed insights (full port of insights.js) ----------
export interface InsightItem { icon?: string; title: string; body: string; metric: string; category: string }
export interface InsightPriorityAction { text: string; urgency: 'urgent' | 'important' }
export interface InsightBundle {
  redFlags: InsightItem[];
  watchAreas: InsightItem[];
  strengths: InsightItem[];
  priorityActions: InsightPriorityAction[];
  nextSteps: string[];
}
export function generateInsights(report: BizlensReport, priorData?: { priorSales?: number; priorOpProfit?: number }, thresholds?: BizlensThresholds): InsightBundle {
  if (!report) return { redFlags: [], watchAreas: [], strengths: [], priorityActions: [], nextSteps: [] };
  const { monthly: m, bs, health: h } = report;
  const thr = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  const redFlags: InsightItem[] = []; const watchAreas: InsightItem[] = []; const strengths: InsightItem[] = [];

  // Profitability
  if (m.opProfit < 0) redFlags.push({ title: 'Operating Loss', body: `Business is incurring a monthly operating loss of ${fmtMoney(Math.abs(m.opProfit))}. Revenue does not cover costs. Immediate cost reduction or revenue increase is critical.`, metric: fmtMoney(m.opProfit), category: 'profitability' });
  else if (m.opPct < 0.05) watchAreas.push({ title: 'Thin Profit Margins', body: `Operating profit margin is only ${fmtPct(m.opPct)}. Small revenue drops could push to loss.`, metric: fmtPct(m.opPct), category: 'profitability' });
  else if (m.opPct >= 0.15) strengths.push({ title: 'Strong Profitability', body: `Operating profit margin of ${fmtPct(m.opPct)} indicates healthy cost control and pricing power.`, metric: fmtPct(m.opPct), category: 'profitability' });

  // Break-even safety
  if (m.mosPct != null && m.mosPct < 0) redFlags.push({ title: 'Below Break-Even Point', body: `Sales are ${fmtPct(Math.abs(m.mosPct))} below break-even. Business needs ${fmtMoney(Math.abs(m.mos))} more monthly sales to cover costs.`, metric: fmtPct(m.mosPct), category: 'breakeven' });
  else if (m.mosPct != null && m.mosPct < 0.10) watchAreas.push({ title: 'Low Safety Buffer', body: `Buffer of ${fmtPct(m.mosPct)} (${fmtMoney(m.mos)}) provides limited cushion against revenue fluctuations.`, metric: fmtPct(m.mosPct), category: 'breakeven' });
  else if (m.mosPct != null && m.mosPct >= 0.25) strengths.push({ title: 'Healthy Safety Buffer', body: `${fmtPct(m.mosPct)} buffer means sales could drop by ${fmtMoney(m.mos)} before hitting break-even.`, metric: fmtPct(m.mosPct), category: 'breakeven' });

  // Cost structure
  if (m.fcPct > 0.40) watchAreas.push({ title: 'High Fixed Costs', body: `Fixed costs consume ${fmtPct(m.fcPct)} of revenue. High operating leverage increases vulnerability during downturns.`, metric: fmtPct(m.fcPct), category: 'costs' });
  else if (m.fcPct < 0.20 && m.opProfit > 0) strengths.push({ title: 'Lean Cost Structure', body: `Fixed costs are only ${fmtPct(m.fcPct)} of revenue, providing flexibility to weather market changes.`, metric: fmtPct(m.fcPct), category: 'costs' });
  if (m.cmPct < 0.20) redFlags.push({ title: 'Low Contribution Margin', body: `Contribution margin of ${fmtPct(m.cmPct)} leaves minimal room to cover fixed costs and generate profit.`, metric: fmtPct(m.cmPct), category: 'costs' });
  else if (m.cmPct >= 0.40) strengths.push({ title: 'Strong Contribution Margin', body: `${fmtPct(m.cmPct)} contribution margin shows good pricing power or efficient variable cost management.`, metric: fmtPct(m.cmPct), category: 'costs' });

  // Liquidity
  if (h.cashRunway != null && h.cashRunway < thr.cashHigh) redFlags.push({ title: 'Critical Cash Position', body: `Cash runway of only ${fmtNum(h.cashRunway)} months. Immediate attention needed to avoid liquidity crisis.`, metric: fmtNum(h.cashRunway) + ' mo', category: 'liquidity' });
  else if (h.cashRunway != null && h.cashRunway < thr.cashGood) watchAreas.push({ title: 'Limited Cash Runway', body: `Cash covers ${fmtNum(h.cashRunway)} months of fixed costs. Build reserves to at least 6 months.`, metric: fmtNum(h.cashRunway) + ' mo', category: 'liquidity' });
  else if (h.cashRunway != null && h.cashRunway >= thr.cashGood) strengths.push({ title: 'Comfortable Cash Position', body: `${fmtNum(h.cashRunway)} months cash runway provides strong buffer.`, metric: fmtNum(h.cashRunway) + ' mo', category: 'liquidity' });

  // Working capital
  if (bs.wc < 0) {
    if (h.wcIntentional) strengths.push({ title: 'Strategic Negative Working Capital', body: `Negative WC of ${fmtMoney(bs.wc)} indicates efficient use of supplier credit to fund operations.`, metric: fmtMoney(bs.wc), category: 'liquidity' });
    else watchAreas.push({ title: 'Negative Working Capital', body: `Working capital of ${fmtMoney(bs.wc)} indicates payables exceed receivables and inventory.`, metric: fmtMoney(bs.wc), category: 'liquidity' });
  } else if (bs.wcSalesRatio > thr.wcSalesHigh) watchAreas.push({ title: 'High Working Capital Requirement', body: `Working capital of ${fmtMoney(bs.wc)} (${fmtNum(bs.wcSalesRatio)}% of monthly sales) ties up significant cash.`, metric: fmtNum(bs.wcSalesRatio) + '%', category: 'liquidity' });

  // Leverage
  if (h.isDebtFree) strengths.push({ title: 'Debt-Free Business', body: 'The business operates with zero debt, providing maximum financial flexibility.', metric: '0 Debt', category: 'leverage' });
  else if (h.deRatio != null && h.deRatio > thr.deLow) redFlags.push({ title: 'High Leverage', body: `Debt-Equity ratio of ${fmtNum(h.deRatio)}× indicates high financial risk.`, metric: fmtNum(h.deRatio) + '×', category: 'leverage' });
  else if (h.deRatio != null && h.deRatio > thr.deHigh) watchAreas.push({ title: 'Moderate Leverage', body: `Debt-Equity of ${fmtNum(h.deRatio)}× is manageable but reduces financial flexibility.`, metric: fmtNum(h.deRatio) + '×', category: 'leverage' });
  else if (h.deRatio != null && h.deRatio <= thr.deHigh) strengths.push({ title: 'Conservative Capital Structure', body: `Low Debt-Equity of ${fmtNum(h.deRatio)}× provides financial stability.`, metric: fmtNum(h.deRatio) + '×', category: 'leverage' });

  // Interest coverage
  if (h.isInterestFree) strengths.push({ title: 'No Interest Burden', body: 'The business has zero interest obligations. All operating profit is available for reinvestment.', metric: 'Rs. 0', category: 'leverage' });
  else if (h.icr != null && h.icr < thr.icrHigh) redFlags.push({ title: 'Weak Debt Servicing', body: `Interest coverage of ${fmtNum(h.icr)}× means profits barely cover interest payments.`, metric: fmtNum(h.icr) + '×', category: 'leverage' });
  else if (h.icr != null && h.icr < thr.icrLow) watchAreas.push({ title: 'Tight Interest Coverage', body: `ICR of ${fmtNum(h.icr)}× leaves limited buffer for profit decline.`, metric: fmtNum(h.icr) + '×', category: 'leverage' });
  else if (h.icr != null && h.icr >= thr.icrLow) strengths.push({ title: 'Strong Interest Coverage', body: `ICR of ${fmtNum(h.icr)}× indicates comfortable debt servicing capacity.`, metric: fmtNum(h.icr) + '×', category: 'leverage' });

  // Concentration
  if (h.topCust != null && h.topCust > thr.concHigh) redFlags.push({ title: 'High Customer Concentration', body: `Top customers account for ${fmtNum(h.topCust)}% of sales. Loss of a key customer would be devastating.`, metric: fmtNum(h.topCust) + '%', category: 'concentration' });
  else if (h.topCust != null && h.topCust > thr.concMed) watchAreas.push({ title: 'Moderate Customer Concentration', body: `${fmtNum(h.topCust)}% revenue from top customers.`, metric: fmtNum(h.topCust) + '%', category: 'concentration' });
  else if (h.topCust != null && h.topCust <= thr.concMed) strengths.push({ title: 'Diversified Customer Base', body: `Top customers account for only ${fmtNum(h.topCust)}% of sales.`, metric: fmtNum(h.topCust) + '%', category: 'concentration' });
  if (h.topSupp != null && h.topSupp > thr.concHigh) redFlags.push({ title: 'High Supplier Dependency', body: `${fmtNum(h.topSupp)}% of purchases from top suppliers. Supply chain risk is elevated.`, metric: fmtNum(h.topSupp) + '%', category: 'concentration' });
  else if (h.topSupp != null && h.topSupp > thr.concMed) watchAreas.push({ title: 'Moderate Supplier Concentration', body: `${fmtNum(h.topSupp)}% purchases from top suppliers.`, metric: fmtNum(h.topSupp) + '%', category: 'concentration' });

  // Ageing
  if (!h.arAgeing) watchAreas.push({ title: 'Receivables Not Tracked', body: 'Debtors ageing not maintained. Collection risks not visible.', metric: 'N/A', category: 'discipline' });
  else {
    const arTotal = h.arAgeing.d0_30 + h.arAgeing.d31_60 + h.arAgeing.d61_90 + h.arAgeing.d90p;
    const over90Pct = arTotal > 0 ? (h.arAgeing.d90p / arTotal) * 100 : 0;
    const over60Pct = arTotal > 0 ? (h.arAgeing.d61_90 / arTotal) * 100 : 0;
    if (over90Pct > 20) redFlags.push({ title: 'Poor Collection Discipline', body: `${fmtNum(over90Pct)}% of receivables are over 90 days old.`, metric: fmtNum(over90Pct) + '%', category: 'discipline' });
    else if (over90Pct > 10 || over60Pct > 25) watchAreas.push({ title: 'Elevated Receivables Ageing', body: `${fmtNum(over90Pct)}% over 90 days, ${fmtNum(over60Pct)}% in 60-90 day bucket.`, metric: fmtNum(over90Pct) + '% 90+', category: 'discipline' });
    else strengths.push({ title: 'Strong Collection Discipline', body: `Only ${fmtNum(over90Pct)}% of receivables over 90 days.`, metric: fmtNum(over90Pct) + '%', category: 'discipline' });
  }
  if (!h.apAgeing) watchAreas.push({ title: 'Payables Not Tracked', body: 'Creditors ageing not maintained.', metric: 'N/A', category: 'discipline' });
  else {
    const apTotal = h.apAgeing.d0_30 + h.apAgeing.d31_60 + h.apAgeing.d61_90 + h.apAgeing.d90p;
    const apOver90Pct = apTotal > 0 ? (h.apAgeing.d90p / apTotal) * 100 : 0;
    if (apOver90Pct > 30 && !h.apStrategic) redFlags.push({ title: 'High Overdue Payables', body: `${fmtNum(apOver90Pct)}% of payables are over 90 days.`, metric: fmtNum(apOver90Pct) + '%', category: 'discipline' });
    else if (apOver90Pct > 15 && !h.apStrategic) watchAreas.push({ title: 'Elevated Payables Ageing', body: `${fmtNum(apOver90Pct)}% of payables over 90 days.`, metric: fmtNum(apOver90Pct) + '%', category: 'discipline' });
    else if (h.apStrategic && apOver90Pct > 15) strengths.push({ title: 'Strategic Supplier Terms', body: `Extended payment terms (${fmtNum(apOver90Pct)}% over 90 days) are negotiated.`, metric: fmtNum(apOver90Pct) + '%', category: 'discipline' });
  }

  // Networth
  if (bs.realNetworth != null) {
    const equity = bs.eq || 0;
    const ratio = equity > 0 ? ((bs.realNetworth - equity) / equity) * 100 : null;
    if (bs.realNetworth <= 0) redFlags.push({ title: 'Negative Networth', body: `Real networth is negative at ${fmtMoney(bs.realNetworth)}. Liabilities currently exceed assets.`, metric: fmtMoney(bs.realNetworth), category: 'networth' });
    else if (equity > 0 && bs.realNetworth < equity * 0.975) watchAreas.push({ title: 'Networth Below Equity', body: `Real networth (${fmtMoney(bs.realNetworth)}) is below invested equity (${fmtMoney(equity)}).`, metric: ratio != null ? fmtPct(ratio / 100) : 'N/A', category: 'networth' });
    else if (equity > 0 && bs.realNetworth <= equity * 1.025) watchAreas.push({ title: 'Networth At Par', body: `Real networth (${fmtMoney(bs.realNetworth)}) is at par with invested equity.`, metric: 'At Par', category: 'networth' });
    else if (ratio != null && ratio >= 50) strengths.push({ title: 'Strong Value Creation', body: `Real networth exceeds equity by ${fmtPct(ratio / 100)}.`, metric: '+' + fmtPct(ratio / 100), category: 'networth' });
    else if (ratio != null && ratio >= 25) strengths.push({ title: 'Healthy Value Creation', body: `Real networth exceeds equity by ${fmtPct(ratio / 100)}.`, metric: '+' + fmtPct(ratio / 100), category: 'networth' });
  }

  // Prior trend
  if (priorData?.priorSales && m.Rm) {
    const salesGrowth = ((m.Rm - priorData.priorSales) / priorData.priorSales) * 100;
    if (salesGrowth < -10) redFlags.push({ title: 'Declining Sales', body: `Sales have declined ${fmtNum(Math.abs(salesGrowth))}% compared to prior period.`, metric: fmtNum(salesGrowth) + '%', category: 'trends' });
    else if (salesGrowth > 20) strengths.push({ title: 'Strong Sales Growth', body: `Sales have grown ${fmtNum(salesGrowth)}% compared to prior period.`, metric: '+' + fmtNum(salesGrowth) + '%', category: 'trends' });
  }

  // Priority actions
  const priorityActions: InsightPriorityAction[] = [];
  redFlags.forEach((r) => {
    let actionText = r.title + ': ';
    switch (r.category) {
      case 'profitability': actionText += 'Review pricing strategy, reduce non-essential costs, and identify revenue growth opportunities within 30 days.'; break;
      case 'breakeven': actionText += 'Develop a 90-day plan to increase sales volume or reduce variable costs to reach break-even.'; break;
      case 'liquidity': actionText += 'Immediately review cash flow, accelerate receivables collection, negotiate extended payment terms with suppliers.'; break;
      case 'leverage': actionText += 'Create a debt reduction plan, prioritize high-interest debt, and avoid new borrowing.'; break;
      case 'concentration': actionText += 'Develop a customer/supplier diversification strategy within 60 days.'; break;
      case 'discipline': actionText += 'Implement weekly ageing review and follow-up process for overdue accounts.'; break;
      case 'networth': actionText += 'Focus on profit retention and asset optimization to rebuild equity.'; break;
      default: actionText += r.body.split('.')[0] + '.';
    }
    priorityActions.push({ text: actionText, urgency: 'urgent' });
  });
  watchAreas.slice(0, Math.max(0, 5 - priorityActions.length)).forEach((w) => {
    priorityActions.push({ text: w.title + ': Monitor closely and develop contingency plan.', urgency: 'important' });
  });

  // Next steps
  const nextSteps: string[] = [];
  if (m.opProfit <= 0) {
    nextSteps.push('Conduct a detailed cost analysis to identify immediate savings opportunities - target 10-15% reduction in discretionary spending.');
    nextSteps.push('Review top 10 customers to identify upsell/cross-sell opportunities to increase revenue.');
  }
  if (h.cashRunway != null && h.cashRunway < thr.cashHigh) {
    nextSteps.push('Prepare 13-week cash flow forecast and update weekly. Identify minimum cash needs.');
    nextSteps.push('Explore working capital financing options (invoice factoring, line of credit) as safety net.');
  }
  if (h.deRatio != null && h.deRatio > thr.deLow) nextSteps.push('Create a debt amortization schedule and identify opportunities for early repayment or refinancing.');
  if (h.topCust != null && h.topCust > thr.concHigh) nextSteps.push('Develop a customer acquisition strategy targeting 3-5 new accounts in the next quarter.');
  if (!h.arAgeing) nextSteps.push('Implement receivables ageing tracking system this week — categorize by 0-30, 31-60, 61-90, and 90+ days.');
  if (!h.apAgeing) nextSteps.push('Set up payables ageing tracking to optimize payment timing and maintain supplier relationships.');
  if (m.mosPct != null && m.mosPct < 0.15 && m.mosPct >= 0) nextSteps.push('Analyze product/service mix to identify high-margin offerings and focus marketing efforts there.');
  if (nextSteps.length === 0) {
    nextSteps.push('Continue monitoring key financial metrics weekly and review full dashboard monthly.');
    nextSteps.push('Set quarterly targets for improving weakest 2-3 indicators.');
    nextSteps.push('Schedule quarterly business review to track progress against financial goals.');
  }

  return { redFlags, watchAreas, strengths, priorityActions, nextSteps };
}

// ---------- Executive summary ----------
export interface KeyMetric { label: string; value: string; status: 'good' | 'bad' | '' }
export interface HealthSnapshotItem { indicator: string; value: string; status: RiskLevel; details: string }
export interface ExecutiveSummary {
  clientName: string;
  date: string;
  period: string;
  overallHealth: 'good' | 'medium' | 'bad';
  healthLabel: string;
  keyMetrics: KeyMetric[];
  operatingHighlights: KeyMetric[];
  healthSnapshot: HealthSnapshotItem[];
  redFlagsCount: number;
  watchAreasCount: number;
  strengthsCount: number;
  priorityActions: InsightPriorityAction[];
  nextSteps: string[];
  categorizedInsights: { redFlags: InsightItem[]; watchAreas: InsightItem[]; strengths: InsightItem[] };
  opportunities: Opportunity[];
  totals: BizlensReport['totals'];
  monthly: BizlensReport['monthly'];
  bs: BizlensReport['bs'];
  health: BizlensReport['health'];
}
export function generateExecutiveSummary(report: BizlensReport, insights: InsightBundle, thresholds?: BizlensThresholds, clientName?: string): ExecutiveSummary | null {
  if (!report) return null;
  const { monthly: m, bs, health: h, totals: t } = report;
  const thr = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  const badCount = [
    h.cashRunway != null && h.cashRunway < thr.cashHigh,
    !h.isDebtFree && h.deRatio != null && h.deRatio > thr.deLow,
    !h.isInterestFree && h.icr != null && h.icr < thr.icrHigh,
    m.opProfit <= 0,
    m.mosPct != null && m.mosPct < 0.08,
  ].filter(Boolean).length;
  const overallHealth: ExecutiveSummary['overallHealth'] = badCount >= 3 ? 'bad' : badCount >= 1 ? 'medium' : 'good';
  const healthLabel = overallHealth === 'good' ? 'Healthy' : overallHealth === 'medium' ? 'Needs attention' : 'At risk';

  const keyMetrics: KeyMetric[] = [
    { label: 'Monthly Sales', value: fmtMoney(m.Rm), status: '' },
    { label: 'Operating Profit', value: fmtMoney(m.opProfit), status: m.opProfit > 0 ? 'good' : 'bad' },
    { label: 'Profit Margin', value: fmtPct(m.opPct), status: m.opPct >= 0.10 ? 'good' : m.opPct < 0 ? 'bad' : '' },
    { label: 'Safety Buffer', value: fmtPct(m.mosPct), status: m.mosPct >= 0.15 ? 'good' : m.mosPct < 0 ? 'bad' : '' },
    { label: 'Cash Runway', value: h.cashRunway != null ? fmtNum(h.cashRunway) + ' mo' : '—', status: h.cashRunway != null && h.cashRunway >= thr.cashGood ? 'good' : (h.cashRunway != null && h.cashRunway < thr.cashHigh ? 'bad' : '') },
    { label: 'Debt-Equity', value: h.isDebtFree ? 'Debt-Free ✓' : (h.deRatio != null ? fmtNum(h.deRatio) + '×' : '—'), status: h.isDebtFree ? 'good' : (h.deRatio != null && h.deRatio < thr.deHigh ? 'good' : (h.deRatio != null && h.deRatio > thr.deLow ? 'bad' : '')) },
  ];
  const operatingHighlights: KeyMetric[] = [
    { label: 'Total Revenue', value: fmtMoney(t.R), status: '' },
    { label: 'Total Operating Profit', value: fmtMoney(t.opTotal), status: t.opTotal > 0 ? 'good' : 'bad' },
    { label: 'Actual P&L', value: fmtMoney(t.actualPL), status: t.actualPL > 0 ? 'good' : 'bad' },
    { label: 'Contribution Margin', value: fmtPct(m.cmPct), status: m.cmPct >= 0.30 ? 'good' : m.cmPct < 0.20 ? 'bad' : '' },
    { label: 'Break-Even Point', value: fmtMoney(m.beSales) + '/mo', status: '' },
    { label: 'Fixed Cost Ratio', value: fmtPct(m.fcPct), status: m.fcPct < 0.25 ? 'good' : m.fcPct > 0.40 ? 'bad' : '' },
  ];
  const healthSnapshot: HealthSnapshotItem[] = [
    { indicator: 'Liquidity', value: h.cashRunway != null ? `${fmtNum(h.cashRunway)} months runway` : 'N/A', status: assessRisk(h.cashRunway, thr, 'cashRunway').level, details: `Cash: ${fmtMoney(bs.cash)}` },
    { indicator: 'Leverage', value: h.isDebtFree ? 'Debt-Free ✓' : (h.deRatio != null ? `${fmtNum(h.deRatio)}× D/E` : 'N/A'), status: h.isDebtFree ? 'good' : assessRisk(h.deRatio, thr, 'deRatio', { isDebtFree: h.isDebtFree }).level, details: h.isDebtFree ? 'No debt obligations' : `Debt: ${fmtMoney(bs.totalDebt)}` },
    { indicator: 'Interest Coverage', value: h.isInterestFree ? 'No Interest ✓' : (h.icr != null ? `${fmtNum(h.icr)}× ICR` : 'N/A'), status: h.isInterestFree ? 'good' : assessRisk(h.icr, thr, 'icr', { isInterestFree: h.isInterestFree }).level, details: h.isInterestFree ? 'No interest obligations' : `Op Profit covers interest ${h.icr != null ? fmtNum(h.icr) : '—'}×` },
    { indicator: 'Working Capital', value: fmtMoney(bs.wc), status: assessRisk(bs.wcSalesRatio, thr, 'wcSales', { wc: bs.wc, wcIntentional: h.wcIntentional }).level, details: `${fmtNum(bs.wcSalesRatio)}% of monthly sales` },
    { indicator: 'Real Networth', value: bs.realNetworth != null ? fmtMoney(bs.realNetworth) : 'N/A', status: assessRisk(bs.realNetworth, thr, 'networth', { equity: bs.eq }).level, details: 'Assets minus Liabilities' },
  ];

  return {
    clientName: clientName || 'Business',
    date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
    period: t.M + ' months',
    overallHealth, healthLabel,
    keyMetrics, operatingHighlights, healthSnapshot,
    redFlagsCount: insights.redFlags.length,
    watchAreasCount: insights.watchAreas.length,
    strengthsCount: insights.strengths.length,
    priorityActions: insights.priorityActions,
    nextSteps: insights.nextSteps,
    categorizedInsights: { redFlags: insights.redFlags, watchAreas: insights.watchAreas, strengths: insights.strengths },
    opportunities: generateOpportunities(report),
    totals: t, monthly: m, bs, health: h,
  };
}

// ---------- Data operations ----------
export async function createReport(payload: { clientId: string; periodMonth: number; periodYear: number; monthsCovered: number; actorId: string }) {
  return await bizlensRepo.createReportRecord({
    client_id: payload.clientId,
    period_month: payload.periodMonth,
    period_year: payload.periodYear,
    months_covered: payload.monthsCovered,
    created_by: payload.actorId,
    status: 'draft',
    is_current: true,
  });
}

export async function updateReport(reportId: string, updates: Partial<BizlensData>) {
  await bizlensRepo.updateReportRecord(reportId, updates);
}

export async function publishReport(reportId: string, clientId: string, actorId: string) {
  const existing = await bizlensRepo.getReportById(reportId);
  if (!existing) throw new Error('Report not found');
  const hasPL = Number(existing.sales_revenue ?? 0) > 0
    || Number(existing.variable_costs ?? 0) > 0
    || Number(existing.fixed_costs ?? 0) > 0;
  if (!hasPL) throw new Error('Cannot publish: enter at least sales revenue or a cost figure first.');
  await bizlensRepo.updateReportRecord(reportId, { status: 'published' });
  await bizlensRepo.logAuditAction({
    action: 'bizlens_report.published',
    entity_type: 'bizlens_report',
    entity_id: reportId,
    actor_id: actorId,
    details: { client_id: clientId },
  });
}

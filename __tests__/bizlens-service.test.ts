import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeReport,
  assessRisk,
  computeWCCycle,
  computeBizLensScore,
  generateOpportunities,
  generateInsights,
  BizlensData,
} from '../lib/services/bizlens-service';

/**
 * Worked-example unit tests for the BizLens math.
 *
 * The numbers below were computed by hand and cross-checked against the
 * legacy `public/bizlens-app/finance.js` calculations. If you change a
 * formula in `bizlens-service.ts`, expect to update these assertions.
 */

const ZERO_BS = {
  bs_cash: 0, bs_inventory: 0, bs_accounts_receivable: 0,
  bs_other_current_assets: 0, bs_loans_advances: 0, realisable_fixed_assets: 0,
  bs_accounts_payable: 0, bs_current_liabilities_other: 0,
  bs_short_term_borrowings: 0, bs_long_term_borrowings: 0,
  bs_other_liabilities: 0, bs_equity: 0,
  ar_ageing_available: false, ar_0_30: 0, ar_31_60: 0, ar_61_90: 0, ar_90_plus: 0,
  ap_ageing_available: false, ap_0_30: 0, ap_31_60: 0, ap_61_90: 0, ap_90_plus: 0,
  top_customer_pct: 0, top_supplier_pct: 0, wc_intentional: false, ap_strategic: false,
};

function base(overrides: Partial<BizlensData> = {}): BizlensData {
  return {
    client_id: 'test',
    period_year: 2024,
    months_covered: 12,
    sales_revenue: 0, variable_costs: 0, fixed_costs: 0,
    fc_includes_interest: true,
    purchases: 0, interest_expense: 0, target_profit: 0,
    inventory_change: 0, other_income: 0, non_cash_expenses: 0,
    ...ZERO_BS,
    ...overrides,
  };
}

describe('BizLens Service Math', () => {
  test('contribution margin + break-even (textbook case)', () => {
    const r = computeReport(base({
      sales_revenue: 1200000,   // 100k / mo
      variable_costs: 480000,   // 40k / mo
      fixed_costs: 360000,      // 30k / mo
      fc_includes_interest: true,
    }));
    assert.equal(r.monthly.Rm, 100000);
    assert.equal(r.monthly.VCm, 40000);
    assert.equal(r.monthly.FCm, 30000);
    assert.equal(r.monthly.contribution, 60000);
    assert.equal(r.monthly.cmPct, 0.60);
    assert.equal(r.monthly.opProfit, 30000);
    assert.equal(r.monthly.beSales, 50000);
    assert.equal(r.monthly.mosPct, 0.50);
  });

  test('cashRunway risk assessment buckets', () => {
    assert.equal(assessRisk(10, { cashGood: 6, cashHigh: 3 }, 'cashRunway').level, 'good');
    assert.equal(assessRisk(4, { cashGood: 6, cashHigh: 3 }, 'cashRunway').level, 'medium');
    assert.equal(assessRisk(1, { cashGood: 6, cashHigh: 3 }, 'cashRunway').level, 'bad');
    assert.equal(assessRisk(null as any, {}, 'cashRunway').label, 'N/A');
  });

  test('FC excluding interest adds interest to fixed costs', () => {
    // Same FC, but flagged as NOT including interest → interest gets added.
    const r = computeReport(base({
      sales_revenue: 1200000,
      variable_costs: 480000,
      fixed_costs: 240000,        // 20k/mo before interest
      fc_includes_interest: false,
      interest_expense: 120000,   // 10k/mo interest
    }));
    assert.equal(r.monthly.FCm, 30000); // 20k + 10k
    assert.equal(r.monthly.INTm, 10000);
    // Op profit = 60k contribution − 30k effective FC = 30k
    assert.equal(r.monthly.opProfit, 30000);
  });

  test('working-capital cycle: DSO / DIO / DPO / CCC', () => {
    const r = computeReport(base({
      sales_revenue: 1200000,            // 100k/mo → 1.2M/yr
      variable_costs: 720000,            // 60k/mo → 720k/yr COGS proxy
      bs_accounts_receivable: 200000,
      bs_inventory: 120000,
      bs_accounts_payable: 60000,
      purchases: 720000,
    }));
    const wc = computeWCCycle(r);
    assert.ok(wc);
    // DSO = AR / annualSales * 365 = 200k / 1.2M * 365 ≈ 60.83 → round 61
    assert.equal(wc!.dso, 61);
    // DIO = Inv / annualCOGS * 365 = 120k / 720k * 365 ≈ 60.83 → round 61
    assert.equal(wc!.dio, 61);
    // DPO = AP / annualPurchases * 365 = 60k / 720k * 365 ≈ 30.42 → round 30
    assert.equal(wc!.dpo, 30);
    // CCC = DSO + DIO − DPO ≈ 91 (using unrounded internals)
    assert.equal(wc!.ccc, 91);
  });

  test('BizLensScore: a healthy debt-free business lands in Strong band', () => {
    const r = computeReport(base({
      sales_revenue: 2400000, variable_costs: 1200000, fixed_costs: 600000,
      fc_includes_interest: true,
      bs_cash: 800000,           // ~16 months of cash at 50k stress outflow
      bs_inventory: 100000, bs_accounts_receivable: 100000,
      bs_accounts_payable: 50000, bs_equity: 600000,
      // No debt, no interest → debt-free path
    }));
    const s = computeBizLensScore(r);
    assert.ok(s);
    assert.ok(s!.scores.structure >= 180, `expected debt-free structure boost, got ${s!.scores.structure}`);
    assert.ok(s!.total >= 650, `expected Strong band (≥650), got ${s!.total}`);
    assert.ok(['Strong Operations', 'Elite Operations'].includes(s!.band), `unexpected band ${s!.band}`);
  });

  test('BizLensScore: critical cash + high leverage drops to At Risk or Critical', () => {
    const r = computeReport(base({
      sales_revenue: 1200000, variable_costs: 600000, fixed_costs: 480000,
      fc_includes_interest: false,
      interest_expense: 240000,  // 20k/mo interest → ICR pressure
      bs_cash: 40000,            // < 1 month at ~60k/mo stress
      bs_short_term_borrowings: 1000000,
      bs_long_term_borrowings: 1000000,
      bs_equity: 200000,         // D/E = 2M / 200k = 10×
      bs_accounts_receivable: 200000,
      bs_inventory: 50000,
      bs_accounts_payable: 100000,
    }));
    const s = computeBizLensScore(r);
    assert.ok(s);
    assert.ok(s!.total < 450, `expected At Risk or Critical band, got ${s!.total}`);
    assert.ok(['Needs Improvement', 'At Risk', 'Critical'].includes(s!.band));
  });

  test('insight engine flags operating loss as red flag', () => {
    const r = computeReport(base({
      sales_revenue: 600000,    // 50k/mo
      variable_costs: 480000,   // 40k/mo
      fixed_costs: 240000,      // 20k/mo → opProfit = -10k/mo
      fc_includes_interest: true,
    }));
    const out = generateInsights(r);
    const titles = out.redFlags.map((x: any) => x.title);
    assert.ok(titles.includes('Operating Loss'), `expected red flag, got ${JSON.stringify(titles)}`);
  });

  test('insight engine: healthy margins surface as a strength', () => {
    const r = computeReport(base({
      sales_revenue: 1200000, variable_costs: 480000, fixed_costs: 240000,
      fc_includes_interest: true,
    }));
    const out = generateInsights(r);
    const titles = out.strengths.map((x: any) => x.title);
    assert.ok(titles.includes('Strong Profitability'), `expected strength, got ${JSON.stringify(titles)}`);
  });

  test('AR ageing >90 days lowers discipline score', () => {
    const cleanAR = computeReport(base({
      sales_revenue: 1200000, variable_costs: 600000, fixed_costs: 240000,
      fc_includes_interest: true,
      bs_cash: 300000, bs_equity: 400000,
      ar_ageing_available: true,
      ar_0_30: 900, ar_31_60: 80, ar_61_90: 15, ar_90_plus: 5,
    }));
    const messyAR = computeReport(base({
      sales_revenue: 1200000, variable_costs: 600000, fixed_costs: 240000,
      fc_includes_interest: true,
      bs_cash: 300000, bs_equity: 400000,
      ar_ageing_available: true,
      ar_0_30: 200, ar_31_60: 200, ar_61_90: 200, ar_90_plus: 400,  // 40% > 90d
    }));
    const cleanScore = computeBizLensScore(cleanAR)!.scores.discipline;
    const messyScore = computeBizLensScore(messyAR)!.scores.discipline;
    assert.ok(cleanScore > messyScore, `expected clean AR (${cleanScore}) > messy AR (${messyScore})`);
  });

  test('opportunities surface DSO + concentration insights', () => {
    const r = computeReport(base({
      sales_revenue: 1200000, variable_costs: 480000, fixed_costs: 240000,
      fc_includes_interest: true,
      purchases: 480000,
      bs_accounts_receivable: 200000,   // → DSO ≈ 61, > 15 → triggers DSO opp
      bs_inventory: 50000,
      bs_accounts_payable: 30000,
      top_customer_pct: 60,             // > 50 → triggers diversify opp
    }));
    const ops = generateOpportunities(r);
    assert.ok(ops.length > 0, 'expected at least one opportunity');
    const types = ops.map((o: any) => o.type);
    assert.ok(types.includes('wc'), `expected WC opportunity, got ${types}`);
    assert.ok(types.includes('risk'), `expected concentration risk opportunity, got ${types}`);
  });

  test('concentration risk thresholds — top customer', () => {
    assert.equal(assessRisk(15, {}, 'concentration').level, 'good');
    assert.equal(assessRisk(40, {}, 'concentration').level, 'medium');
    assert.equal(assessRisk(70, {}, 'concentration').level, 'bad');
    assert.equal(assessRisk(null as any, {}, 'concentration').label, 'Not Tracked');
  });

  test('interest-coverage ratio surfaces in structure score', () => {
    // Strong ICR (opProfit 30k vs interest 5k → ICR=6) should boost structure.
    const strong = computeReport(base({
      sales_revenue: 1200000, variable_costs: 480000, fixed_costs: 300000,
      fc_includes_interest: false, interest_expense: 60000,
      bs_short_term_borrowings: 200000, bs_equity: 1000000,
    }));
    // Weak ICR (opProfit 5k vs interest 10k → ICR<1) drags structure down.
    const weak = computeReport(base({
      sales_revenue: 600000, variable_costs: 360000, fixed_costs: 180000,
      fc_includes_interest: false, interest_expense: 120000,
      bs_short_term_borrowings: 800000, bs_equity: 200000,
    }));
    const strongScore = computeBizLensScore(strong)!.scores.structure;
    const weakScore = computeBizLensScore(weak)!.scores.structure;
    assert.ok(strongScore > weakScore, `strong ICR structure (${strongScore}) should exceed weak ICR (${weakScore})`);
  });
});

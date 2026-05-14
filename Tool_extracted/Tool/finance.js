const Finance = (() => {
  const toNum = (v) => {
    if (v == null || v === '') return 0;
    const n = Number(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const fmtMoney = (n) => {
    if (n == null || isNaN(n)) return 'Rs. --';
    const abs = Math.round(Math.abs(n));
    // Format with Indian number system - NO decimals
    const formatted = abs.toLocaleString('en-IN', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    return (n >= 0 ? 'Rs. ' : '−Rs. ') + formatted;
  };

  // Compact format for large values in tight spaces (e.g. 15.02L, 1.5Cr)
  const fmtMoneyCompact = (n) => {
    if (n == null || isNaN(n)) return 'Rs. --';
    const abs = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (abs >= 1e7) return sign + 'Rs. ' + (abs / 1e7).toFixed(2) + ' Cr';
    if (abs >= 1e5) return sign + 'Rs. ' + (abs / 1e5).toFixed(2) + ' L';
    if (abs >= 1e3) return sign + 'Rs. ' + (abs / 1e3).toFixed(1) + 'K';
    return sign + 'Rs. ' + Math.round(abs);
  };

  const fmtNum = (n, d = 0) => {
    if (n == null || isNaN(n)) return '--';
    // Only show decimals when explicitly requested OR when the value truly has decimal component
    if (d > 0) {
      return Number(n).toFixed(d);
    }
    // For values less than 10 that are not whole numbers, show 2 decimals (e.g. ratios like 1.5)
    if (Math.abs(n) < 10 && n % 1 !== 0) {
      return Number(n).toFixed(2);
    }
    const rounded = Math.round(n);
    return rounded.toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
  };

  const fmtPct = (n) => {
    if (n == null || isNaN(n)) return '--';
    return (n * 100).toFixed(1) + '%';
  };

  const todayStr = () => new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const timestampStr = () => new Date().toLocaleString('en-IN');
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const validateInputs = (inputs) => {
    const errors = [];
    
    // Fields that MUST be non-zero (structural requirements)
    const nonZeroRequired = ['M', 'R', 'BS_EQ'];
    const missingNonZero = nonZeroRequired.filter(k => {
      const v = inputs[k];
      return v == null || String(v).trim() === '' || toNum(v) === 0;
    });
    if (missingNonZero.length > 0) {
      const labels = { M: 'Period', R: 'Sales', BS_EQ: 'Equity' };
      const names = missingNonZero.map(k => labels[k] || k);
      errors.push('Required (cannot be zero): ' + names.join(', '));
    }
    
    // Fields that must be present but CAN be zero (zero = valid business signal)
    const zeroAllowed = ['VC', 'FC', 'PUR', 'INT', 'BS_CASH', 'BS_INV', 'BS_AR', 'BS_AP'];
    const missingPresence = zeroAllowed.filter(k => {
      const v = inputs[k];
      return v == null || String(v).trim() === '';
    });
    if (missingPresence.length > 0) {
      const labels = { VC: 'Variable Costs', FC: 'Fixed Costs', PUR: 'Purchases', INT: 'Interest',
        BS_CASH: 'Cash', BS_INV: 'Inventory', BS_AR: 'Receivables', BS_AP: 'Payables' };
      const names = missingPresence.map(k => labels[k] || k);
      errors.push('Please fill in (enter 0 if none): ' + names.join(', '));
    }
    
    if (toNum(inputs.M) < 1) errors.push('Period must be at least 1 month');
    if (toNum(inputs.R) < 0) errors.push('Sales cannot be negative');
    if (toNum(inputs.FC) === 0 && toNum(inputs.VC) === 0) errors.push('Both Fixed and Variable costs cannot be zero');
    
    return errors;
  };

  const computeReport = (inputs) => {
    const M = Math.max(1, toNum(inputs.M));
    const R = toNum(inputs.R);
    const VC = toNum(inputs.VC);
    const FC_raw = toNum(inputs.FC);
    const PUR = toNum(inputs.PUR);
    const INT = toNum(inputs.INT);
    const TP = toNum(inputs.TP) || 0;
    const INV = toNum(inputs.INV);
    const OI = toNum(inputs.OI);
    const NC = toNum(inputs.NC);
    
    const FC_INCLUDES_INT = inputs.FC_INCLUDES_INT === true || inputs.FC_INCLUDES_INT === 'yes' || inputs.FC_INCLUDES_INT === 'true';
    
    const FCm = FC_INCLUDES_INT ? FC_raw / M : (FC_raw / M + INT / M);
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
    
    // Balance Sheet
    const cash = toNum(inputs.BS_CASH);
    const inv = toNum(inputs.BS_INV);
    const ar = toNum(inputs.BS_AR);
    const otherCA = toNum(inputs.BS_OTHER_CA);
    const loansAdv = toNum(inputs.BS_LOANS_ADV);
    const ap = toNum(inputs.BS_AP);
    const clx = toNum(inputs.BS_CLX);
    const stb = toNum(inputs.BS_STB);
    const ltb = toNum(inputs.BS_LTB);
    const otherLiab = toNum(inputs.BS_OTHER_LIAB);
    const eq = toNum(inputs.BS_EQ);
    const realisableFA = toNum(inputs.REALISABLE_FA) || 0;
    
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
    
    const parseAgeing = (p) => ({
      d0_30: toNum(inputs['AR_0_30']) || 0,
      d31_60: toNum(inputs['AR_31_60']) || 0,
      d61_90: toNum(inputs['AR_61_90']) || 0,
      d90p: toNum(inputs['AR_90P']) || 0
    });
    
    const parseAPAgeing = () => ({
      d0_30: toNum(inputs['AP_0_30']) || 0,
      d31_60: toNum(inputs['AP_31_60']) || 0,
      d61_90: toNum(inputs['AP_61_90']) || 0,
      d90p: toNum(inputs['AP_90P']) || 0
    });
    
    const arAgeingAvail = inputs.AR_AGEING_AVAIL === 'yes';
    const apAgeingAvail = inputs.AP_AGEING_AVAIL === 'yes';
    
    const arAgeing = arAgeingAvail ? parseAgeing() : null;
    const apAgeing = apAgeingAvail ? parseAPAgeing() : null;
    
    const topCust = toNum(inputs.TOP_CUST_PCT) || null;
    const topSupp = toNum(inputs.TOP_SUPP_PCT) || null;
    
    // Strategic toggles
    const wcIntentional = inputs.WC_INTENTIONAL === 'yes';
    const apStrategic = inputs.AP_STRATEGIC === 'yes';
    
    // Debt-free signals
    const isDebtFree = (stb + ltb) === 0;
    const isInterestFree = INT === 0;
    
    return {
      monthly: {
        M, Rm, VCm, FCm, INTm, contribution, cmPct, fcPct,
        opProfit, opPct, beSales, mos, mosPct, tpReqSales
      },
      totals: {
        M, R, VC, FC: FCm * M, INT, PUR, TP,
        INV, OI, NC, opTotal, actualPL
      },
      bs: {
        cash, inv, ar, otherCA, loansAdv, totalCurrentAssets,
        ap, clx, stb, ltb, otherLiab, totalLiabilities, totalDebt,
        eq, wc, wcSalesRatio, realNetworth, realisableFA
      },
      health: {
        cashRunway, deRatio, icr, arAgeing, apAgeing,
        topCust, topSupp, stressOutflow,
        fcIncludesInterest: FC_INCLUDES_INT,
        wcIntentional, apStrategic,
        isDebtFree, isInterestFree
      }
    };
  };

  const assessRisk = (value, thresholds, type, extra) => {
    const thr = thresholds || {};
    
    if (type === 'cashRunway') {
      if (value == null) return { level: 'medium', label: 'N/A' };
      if (value < (thr.cashHigh || 3)) return { level: 'bad', label: 'Critical' };
      if (value < (thr.cashGood || 6)) return { level: 'medium', label: 'Watch' };
      return { level: 'good', label: 'Healthy' };
    }
    
    if (type === 'wcSales') {
      if (value == null) return { level: 'medium', label: 'N/A' };
      // Check if WC is negative
      const wc = extra?.wc;
      const wcIntentional = extra?.wcIntentional;
      if (wc != null && wc < 0) {
        if (wcIntentional) {
          return { level: 'good', label: 'Strategic' };
        } else {
          return { level: 'bad', label: 'Liquidity Risk' };
        }
      }
      // Positive WC - assess ratio
      if (value > (thr.wcSalesHigh || 40)) return { level: 'bad', label: 'High' };
      if (value > (thr.wcSalesMed || 25)) return { level: 'medium', label: 'Elevated' };
      return { level: 'good', label: 'Normal' };
    }
    
    if (type === 'deRatio') {
      if (value == null) {
        if (extra?.isDebtFree) return { level: 'good', label: 'Debt-Free' };
        return { level: 'medium', label: 'N/A' };
      }
      if (value > (thr.deLow || 2)) return { level: 'bad', label: 'High Risk' };
      if (value > (thr.deHigh || 1)) return { level: 'medium', label: 'Moderate' };
      return { level: 'good', label: 'Low Risk' };
    }
    
    if (type === 'icr') {
      if (value == null) {
        // Check if interest is zero (debt-free = positive signal)
        if (extra?.isInterestFree) return { level: 'good', label: 'Debt-Free' };
        return { level: 'medium', label: 'N/A' };
      }
      if (value < (thr.icrHigh || 1.5)) return { level: 'bad', label: 'Poor' };
      if (value < (thr.icrLow || 3)) return { level: 'medium', label: 'Adequate' };
      return { level: 'good', label: 'Strong' };
    }
    
    if (type === 'concentration') {
      if (value == null) return { level: 'medium', label: 'Not Tracked' };
      if (value > (thr.concHigh || 50)) return { level: 'bad', label: 'High Risk' };
      if (value > (thr.concMed || 30)) return { level: 'medium', label: 'Moderate' };
      return { level: 'good', label: 'Diversified' };
    }
    
    // AR Ageing - quality based assessment
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
    
    // AP Ageing - quality based with strategic toggle
    if (type === 'apAgeing') {
      if (!value) return { level: 'neutral', label: 'Not Tracked' };
      const total = value.d0_30 + value.d31_60 + value.d61_90 + value.d90p;
      if (total === 0) return { level: 'neutral', label: 'No Data' };
      const pct90 = (value.d90p / total) * 100;
      const apStrategic = extra?.apStrategic;
      if (pct90 > 30) {
        return apStrategic ? { level: 'medium', label: 'Extended Terms' } : { level: 'bad', label: 'Overdue Risk' };
      }
      if (pct90 > 15) {
        return apStrategic ? { level: 'good', label: 'Negotiated' } : { level: 'medium', label: 'Watch' };
      }
      return { level: 'good', label: 'Current' };
    }
    
    // Legacy ageing type - keep for backwards compatibility
    if (type === 'ageing') {
      return value ? { level: 'good', label: 'Tracked' } : { level: 'neutral', label: 'Not Tracked' };
    }
    
    // Networth - compare to equity
    if (type === 'networth') {
      if (value == null) return { level: 'medium', label: 'N/A' };
      const equity = extra?.equity || 0;
      if (value <= 0) return { level: 'bad', label: 'Negative' };
      if (equity <= 0) return { level: 'good', label: 'Positive' }; // Can't compare if no equity
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
  };

  const simulateScenario = (baseMonthly, changes, months, baseBS, extraInputs) => {
    const { salesAbs, salesPct, vcAbs, vcPct, fcAbs, fcPct } = changes;
    const M = Math.max(1, months || 12);
    
    let Rm = baseMonthly.Rm;
    if (salesAbs) Rm += salesAbs;
    if (salesPct) Rm = Rm * (1 + salesPct / 100);
    
    let VCm = baseMonthly.VCm;
    if (vcAbs) VCm += vcAbs;
    if (vcPct) VCm = VCm * (1 + vcPct / 100);
    
    let FCm = baseMonthly.FCm;
    if (fcAbs) FCm += fcAbs;
    if (fcPct) FCm = FCm * (1 + fcPct / 100);
    
    const contribution = Rm - VCm;
    const cmPct = Rm > 0 ? contribution / Rm : 0;
    const op = contribution - FCm;
    const opPct = Rm > 0 ? op / Rm : 0;
    
    const be = cmPct > 0 ? FCm / cmPct : 0;
    const mos = Rm - be;
    const mosPct = Rm > 0 ? mos / Rm : 0;
    
    // === Balance Sheet & Working Capital Impact Estimation ===
    let bsImpact = null;
    if (baseBS && baseMonthly.Rm > 0) {
      const salesGrowthPct = (Rm - baseMonthly.Rm) / baseMonthly.Rm;
      const vcGrowthPct = baseMonthly.VCm > 0 ? (VCm - baseMonthly.VCm) / baseMonthly.VCm : 0;
      
      // AR scales with sales (more sales = more credit given)
      const estARChange = baseBS.ar * salesGrowthPct;
      // Inventory scales with volume (VC growth as proxy)
      const estInvChange = baseBS.inv * vcGrowthPct;
      // AP scales with sales (proxy for purchase growth)
      const estAPChange = baseBS.ap * salesGrowthPct;
      
      const currentWC = baseBS.ar + baseBS.inv - baseBS.ap;
      const newAR = baseBS.ar + estARChange;
      const newInv = baseBS.inv + estInvChange;
      const newAP = baseBS.ap + estAPChange;
      const newWC = newAR + newInv - newAP;
      const wcChange = newWC - currentWC;
      
      // Cash flow impact: profit generated minus WC absorbed
      const additionalProfit = (op - baseMonthly.opProfit) * M;
      const cashFlowImpact = additionalProfit - wcChange;
      
      // Derive actual cost of debt from user's data instead of hardcoded 12%
      const totalDebt = (baseBS.stb || 0) + (baseBS.ltb || 0);
      const monthlyInterest = extraInputs?.INTm || 0;
      const actualRate = (totalDebt > 0 && monthlyInterest > 0) ? (monthlyInterest * 12) / totalDebt : 0.12;
      
      // Interest impact: if WC increases and cash is insufficient, may need debt
      const cashAvailable = baseBS.cash + additionalProfit;
      const additionalDebtNeeded = wcChange > cashAvailable ? wcChange - cashAvailable : 0;
      const interestOnNewDebt = additionalDebtNeeded * actualRate / 12;
      
      // Adjusted profit after interest on new WC financing
      const adjustedOp = op - interestOnNewDebt;
      
      // === Equity Impact ===
      const retainedProfit = additionalProfit; // Cumulative over M months
      const newEquity = baseBS.eq + retainedProfit;
      const newTotalDebt = totalDebt + additionalDebtNeeded;
      const currentDE = baseBS.eq > 0 ? totalDebt / baseBS.eq : null;
      const newDE = newEquity > 0 ? newTotalDebt / newEquity : null;
      
      // New cash position
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
        currentDE,
        newDE,
        newCash: Math.round(newCash),
        newCashRunway
      };
    }
    
    return {
      Rm, VCm, FCm, contribution, cmPct, op, opPct,
      be, mos, mosPct, totalSales: Rm * M,
      bsImpact
    };
  };

  const projectScenario = (scenario, months) => {
    if (!scenario) return null;
    return {
      sales: scenario.Rm * months,
      op: scenario.op * months,
      mos: scenario.mos * months,
      be: scenario.be,
      mosPct: scenario.mosPct
    };
  };

  // === Working Capital Cycle Computation ===
  const computeWCCycle = (report, extraInputs) => {
    if (!report) return null;
    const { monthly: m, totals: t, bs } = report;
    
    const annualSales = m.Rm * 12;
    const annualCOGS = m.VCm * 12; // Proxy: VC ≈ COGS
    const annualPurchases = t.PUR > 0 ? (t.PUR / t.M) * 12 : annualCOGS;
    
    // Days calculations (based on annualized figures)
    const dso = annualSales > 0 ? (bs.ar / annualSales) * 365 : 0;
    const dio = annualCOGS > 0 ? (bs.inv / annualCOGS) * 365 : 0;
    const dpo = annualPurchases > 0 ? (bs.ap / annualPurchases) * 365 : 0;
    
    const ccc = dso + dio - dpo;
    
    const dailySales = annualSales / 365;
    const cashLockedInCycle = ccc * dailySales;
    
    // Derive actual cost of debt
    const totalDebt = (bs.stb || 0) + (bs.ltb || 0);
    const monthlyInterest = extraInputs?.INTm || 0;
    const actualRate = (totalDebt > 0 && monthlyInterest > 0) ? (monthlyInterest * 12) / totalDebt : 0.12;
    
    const wcFinancingCost = Math.max(0, cashLockedInCycle) * actualRate;
    const monthlyWCCost = wcFinancingCost / 12;
    
    // What-if: reducing DSO by N days
    const dsoReduction5 = dailySales * 5; // Cash freed if DSO drops 5 days
    const dsoReduction10 = dailySales * 10;
    
    // What-if: reducing DIO by N days
    const dailyCOGS = annualCOGS / 365;
    const dioReduction5 = dailyCOGS * 5;
    
    // What-if: increasing DPO by N days
    const dailyPurchases = annualPurchases / 365;
    const dpoIncrease5 = dailyPurchases * 5;
    
    // Efficiency score (0-100)
    let efficiencyScore;
    if (ccc <= 0) efficiencyScore = 100; // Negative CCC = excellent
    else if (ccc <= 30) efficiencyScore = 85;
    else if (ccc <= 60) efficiencyScore = 65;
    else if (ccc <= 90) efficiencyScore = 45;
    else efficiencyScore = Math.max(10, 45 - (ccc - 90) * 0.3);
    
    return {
      dso: Math.round(dso),
      dio: Math.round(dio),
      dpo: Math.round(dpo),
      ccc: Math.round(ccc),
      cashLockedInCycle: Math.round(cashLockedInCycle),
      wcFinancingCost: Math.round(wcFinancingCost),
      monthlyWCCost: Math.round(monthlyWCCost),
      efficiencyScore: Math.round(efficiencyScore),
      scenarios: {
        dsoMinus5: Math.round(dsoReduction5),
        dsoMinus10: Math.round(dsoReduction10),
        dioMinus5: Math.round(dioReduction5),
        dpoPlus5: Math.round(dpoIncrease5)
      },
      dailySales: Math.round(dailySales),
      annualSales,
      annualCOGS,
      annualPurchases
    };
  };

  const calcOptimumScenarios = (baseMonthly, targetProfit, months) => {
    const M = Math.max(1, months || 12);
    const targetMonthly = targetProfit / M;
    const baseOp = baseMonthly.opProfit;
    const gap = targetMonthly - baseOp;
    
    if (gap <= 0) {
      return {
        feasible: true,
        reason: 'Target already achieved',
        targetMonthly,
        scenarios: []
      };
    }
    
    const scenarios = [];
    const baseCM = baseMonthly.cmPct;
    
    if (baseCM > 0) {
      const salesIncrease = gap / baseCM;
      const newSales = baseMonthly.Rm + salesIncrease;
      const newContribution = (newSales - baseMonthly.VCm);
      const newOp = newContribution - baseMonthly.FCm;
      
      scenarios.push({
        id: 1,
        title: 'Increase Sales',
        desc: 'Grow revenue while maintaining current cost structure',
        sales: newSales,
        vc: baseMonthly.VCm,
        fc: baseMonthly.FCm,
        deltaSales: salesIncrease,
        deltaVC: 0,
        deltaFC: 0,
        feasible: true,
        newCM: baseCM
      });
    }
    
    if (baseMonthly.VCm > 0 && baseMonthly.Rm > 0) {
      const vcReduction = gap;
      const newVC = Math.max(0, baseMonthly.VCm - vcReduction);
      const newCM = baseMonthly.Rm > 0 ? (baseMonthly.Rm - newVC) / baseMonthly.Rm : 0;
      
      scenarios.push({
        id: 2,
        title: 'Reduce Variable Costs',
        desc: 'Improve margins through procurement efficiency',
        sales: baseMonthly.Rm,
        vc: newVC,
        fc: baseMonthly.FCm,
        deltaSales: 0,
        deltaVC: -vcReduction,
        deltaFC: 0,
        feasible: newVC >= 0,
        newCM
      });
    }
    
    scenarios.push({
      id: 3,
      title: 'Balanced Approach',
      desc: 'Moderate sales growth + cost optimization',
      sales: baseMonthly.Rm * 1.1,
      vc: baseMonthly.VCm * 0.95,
      fc: baseMonthly.FCm * 0.98,
      deltaSales: baseMonthly.Rm * 0.1,
      deltaVC: -baseMonthly.VCm * 0.05,
      deltaFC: -baseMonthly.FCm * 0.02,
      feasible: true
    });
    
    return {
      feasible: scenarios.length > 0,
      reason: scenarios.length === 0 ? 'Cannot achieve target with current structure' : null,
      targetMonthly,
      scenarios
    };
  };

  // === Break-Even Days Analysis ===
  const computeBreakEvenDays = (report) => {
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
    if (beDays >= 30) narrative = 'The business doesn\'t break even within the month. Revenue needs to increase or costs need to come down.';
    else if (beDays >= 25) narrative = 'Only ' + profitDays + ' days generate profit. A small disruption could push into loss.';
    else if (beDays >= 20) narrative = 'Costs are covered by the ' + beDays + 'th. ' + profitDays + ' days of profit — reasonable but improvable.';
    else if (beDays >= 15) narrative = 'Costs covered by mid-month. ' + profitDays + ' profit days gives a healthy safety margin.';
    else narrative = 'Excellent — costs covered by day ' + beDays + '. More than half the month generates pure profit.';
    
    return { beDays, profitDays, freedomDay, beRatio, dailySales: Math.round(dailySales), dailyProfit: Math.round(dailyProfit), narrative, isLoss: m.opProfit <= 0 };
  };

  // === Debt Freedom Date ===
  const computeDebtFreedom = (report) => {
    if (!report) return null;
    const { monthly: m, bs, health: h } = report;
    if (h.isDebtFree || bs.totalDebt <= 0) return null;
    if (m.opProfit <= 0) return { feasible: false, reason: 'Business is not profitable — debt repayment requires positive operating profit.', totalDebt: bs.totalDebt };
    
    return {
      feasible: true,
      totalDebt: bs.totalDebt,
      monthlyProfit: m.opProfit,
      scenarios: [10, 25, 50].map(pct => {
        const monthly = m.opProfit * (pct / 100);
        const months = monthly > 0 ? Math.ceil(bs.totalDebt / monthly) : Infinity;
        const dt = new Date(); dt.setMonth(dt.getMonth() + months);
        return { pct, monthly: Math.round(monthly), months, years: Math.floor(months / 12), rem: months % 12, date: dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), label: Math.floor(months / 12) > 0 ? Math.floor(months / 12) + 'y ' + (months % 12) + 'm' : (months % 12) + ' months' };
      })
    };
  };

  // === Auto-generate Opportunities ===
  const generateOpportunities = (report) => {
    if (!report) return [];
    const { monthly: m, bs, health: h } = report;
    const opps = [];
    const wcc = computeWCCycle(report);
    
    if (wcc && wcc.dso > 15) opps.push({ text: 'Collect 5 days faster → frees ' + fmtMoneyCompact(wcc.scenarios.dsoMinus5), type: 'wc' });
    if (wcc && wcc.dio > 10) opps.push({ text: 'Reduce inventory by 5 days → frees ' + fmtMoneyCompact(wcc.scenarios.dioMinus5), type: 'wc' });
    if (m.cmPct < 0.30 && m.VCm > 0) {
      const target = m.Rm * 0.03; // 3% improvement
      opps.push({ text: 'Improve CM by 3% → +' + fmtMoneyCompact(target) + '/mo', type: 'margin' });
    }
    if (m.fcPct > 0.25) {
      const saving = m.FCm * 0.05;
      opps.push({ text: 'Cut fixed costs 5% → saves ' + fmtMoneyCompact(saving) + '/mo', type: 'cost' });
    }
    if (m.mosPct < 0.15 && m.mosPct >= 0) opps.push({ text: 'Grow sales 10% → widens safety margin', type: 'growth' });
    if (h.topCust > 50) opps.push({ text: 'Diversify customer base to reduce concentration risk', type: 'risk' });
    if (wcc && wcc.dpo < 20) opps.push({ text: 'Negotiate 5 more days to pay → frees ' + fmtMoneyCompact(wcc.scenarios.dpoPlus5), type: 'wc' });
    
    return opps.slice(0, 5);
  };

  // === BizLens Score (0-1000) ===
  const computeBizLensScore = (report, thresholds) => {
    if (!report) return null;
    const { health: h, monthly: m, bs } = report;
    const thr = thresholds || {};
    let scores = {};
    
    // 1. Liquidity (0-250)
    const cr = h.cashRunway;
    let liq = 0;
    if (cr >= 6) liq = 250;
    else if (cr >= 3) liq = 180 + (cr - 3) / 3 * 70;
    else if (cr >= 1) liq = 100 + (cr - 1) / 2 * 80;
    else if (cr > 0) liq = cr * 100;
    // WC bonus/penalty
    const wcRatio = bs.wcSalesRatio;
    if (wcRatio != null && wcRatio > 0 && wcRatio < 25) liq = Math.min(250, liq + 20);
    else if (wcRatio != null && wcRatio > 50) liq = Math.max(0, liq - 30);
    scores.liquidity = Math.round(clamp(liq, 0, 250));
    
    // 2. Discipline (0-200)
    let disc = 100; // start neutral
    const arData = h.arAgeing;
    const apData = h.apAgeing;
    if (arData) {
      const total = arData.d0_30 + arData.d31_60 + arData.d61_90 + arData.d90p;
      if (total > 0) {
        const pct90 = arData.d90p / total;
        disc += (pct90 < 0.05 ? 50 : pct90 < 0.10 ? 30 : pct90 < 0.20 ? 10 : -30);
      }
    } else disc -= 20; // not tracked penalty
    if (apData) {
      const total = apData.d0_30 + apData.d31_60 + apData.d61_90 + apData.d90p;
      if (total > 0) {
        const pct90 = apData.d90p / total;
        disc += (pct90 < 0.10 ? 30 : pct90 < 0.20 ? 15 : -10);
      }
    } else disc -= 10;
    scores.discipline = Math.round(clamp(disc, 0, 200));
    
    // 3. Structure (0-200)
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
    // ICR bonus
    if (h.icr != null) {
      if (h.icr >= 5) struct += 40;
      else if (h.icr >= 3) struct += 25;
      else if (h.icr >= 1.5) struct += 10;
      else struct -= 10;
    } else if (h.isInterestFree) struct += 20;
    scores.structure = Math.round(clamp(struct, 0, 200));
    
    // 4. Concentration (0-150)
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
    
    // 5. Networth (0-200)
    let nw = 0;
    const realNW = bs.realNetworth;
    const eq = bs.equity;
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
    
    let band, bandColor;
    if (total >= 800) { band = 'Elite Operations'; bandColor = 'elite'; }
    else if (total >= 650) { band = 'Strong Operations'; bandColor = 'strong'; }
    else if (total >= 450) { band = 'Needs Improvement'; bandColor = 'improve'; }
    else if (total >= 250) { band = 'At Risk'; bandColor = 'atrisk'; }
    else { band = 'Critical'; bandColor = 'critical'; }
    
    return { total, scores, band, bandColor, max: 1000 };
  };

  // === Trend Analysis ===
  const computeTrends = (currentReport, priorPeriods) => {
    if (!priorPeriods || priorPeriods.length === 0) return null;
    
    // priorPeriods: array of { monthly, bs, health } objects, newest first
    const current = currentReport.monthly;
    const periods = [current, ...priorPeriods.map(p => p.monthly)];
    const labels = ['Current'];
    priorPeriods.forEach((_, i) => labels.push('Month -' + (i + 1)));
    
    // Calculate trends
    const salesTrend = periods.map(p => p.Rm);
    const vcTrend = periods.map(p => p.VCm);
    const fcTrend = periods.map(p => p.FCm);
    const profitTrend = periods.map(p => p.opProfit);
    const cmPctTrend = periods.map(p => p.cmPct);
    const beTrend = periods.map(p => p.beSales);
    
    // Direction: compare current vs oldest
    const oldest = periods[periods.length - 1];
    const direction = (curr, old) => {
      if (old === 0) return { pct: 0, dir: 'flat' };
      const pct = ((curr - old) / Math.abs(old)) * 100;
      return { pct: Math.round(pct * 10) / 10, dir: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat' };
    };
    
    const salesDir = direction(current.Rm, oldest.Rm);
    const profitDir = direction(current.opProfit, oldest.opProfit);
    const cmDir = direction(current.cmPct, oldest.cmPct);
    const fcDir = direction(current.FCm, oldest.FCm);
    
    // Key insights
    const keyInsights = [];
    if (salesDir.dir === 'up' && profitDir.dir === 'down') keyInsights.push({ type: 'warn', text: 'Sales growing but profit declining — margins are compressing.' });
    if (salesDir.dir === 'down' && salesDir.pct < -5) keyInsights.push({ type: 'bad', text: 'Revenue declining ' + Math.abs(salesDir.pct) + '% over the period.' });
    if (profitDir.dir === 'up' && profitDir.pct > 10) keyInsights.push({ type: 'good', text: 'Profit improved ' + profitDir.pct + '% — positive trajectory.' });
    if (fcDir.dir === 'up' && fcDir.pct > 5) keyInsights.push({ type: 'warn', text: 'Fixed costs rising ' + fcDir.pct + '% — monitor cost discipline.' });
    if (cmDir.dir === 'down') keyInsights.push({ type: 'warn', text: 'Contribution margin declining — pricing or cost pressure.' });
    
    // Health trend (if BS data available in prior periods)
    const healthInsights = [];
    if (priorPeriods[0]?.health) {
      const priorH = priorPeriods[0].health;
      const currH = currentReport.health;
      if (currH.cashRunway < priorH.cashRunway) healthInsights.push({ type: 'warn', text: 'Cash runway decreased from ' + fmtNum(priorH.cashRunway, 1) + ' to ' + fmtNum(currH.cashRunway, 1) + ' months.' });
      else if (currH.cashRunway > priorH.cashRunway) healthInsights.push({ type: 'good', text: 'Cash runway improved to ' + fmtNum(currH.cashRunway, 1) + ' months.' });
      if (currH.deRatio != null && priorH.deRatio != null) {
        if (currH.deRatio > priorH.deRatio + 0.3) healthInsights.push({ type: 'warn', text: 'Leverage increased from ' + fmtNum(priorH.deRatio, 1) + '× to ' + fmtNum(currH.deRatio, 1) + '×.' });
        else if (currH.deRatio < priorH.deRatio - 0.3) healthInsights.push({ type: 'good', text: 'Leverage improved to ' + fmtNum(currH.deRatio, 1) + '×.' });
      }
    }
    
    return {
      periods: periods.length,
      labels: labels.reverse(),
      data: {
        sales: salesTrend.reverse(),
        vc: vcTrend.reverse(),
        fc: fcTrend.reverse(),
        profit: profitTrend.reverse(),
        cmPct: cmPctTrend.reverse(),
        be: beTrend.reverse()
      },
      directions: { sales: salesDir, profit: profitDir, cm: cmDir, fc: fcDir },
      keyInsights,
      healthInsights
    };
  };

  // === Monte Carlo Simulation ===
  const runMonteCarlo = (baseMonthly, variances, iterations = 1000) => {
    const results = [];
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

    const percentile = (arr, p) => {
      const idx = Math.floor(arr.length * p / 100);
      return arr[Math.min(idx, arr.length - 1)];
    };

    // Build histogram bins
    const min = results[0];
    const max = results[results.length - 1];
    const range = max - min || 1;
    const binCount = Math.min(20, Math.max(8, Math.ceil(Math.sqrt(iterations))));
    const binWidth = range / binCount;
    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const count = results.filter(r => r >= lo && (i === binCount - 1 ? r <= hi : r < hi)).length;
      bins.push({ lo: Math.round(lo), hi: Math.round(hi), count, label: fmtMoney(Math.round((lo + hi) / 2)) });
    }

    const lossCount = results.filter(r => r < 0).length;
    const lossProbability = Math.round((lossCount / iterations) * 100);

    return {
      results,
      p5: percentile(results, 5),
      p50: percentile(results, 50),
      p95: percentile(results, 95),
      mean: Math.round(results.reduce((a, b) => a + b, 0) / results.length),
      min: results[0],
      max: results[results.length - 1],
      bins,
      lossProbability,
      iterations
    };
  };

  // === Future Projections (Linear Regression) ===
  const linearRegression = (values) => {
    const n = values.length;
    if (n < 2) return null;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const r2 = (() => {
      const meanY = sumY / n;
      let ssTot = 0, ssRes = 0;
      for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * i;
        ssTot += (values[i] - meanY) ** 2;
        ssRes += (values[i] - predicted) ** 2;
      }
      return ssTot > 0 ? 1 - ssRes / ssTot : 0;
    })();
    return { slope, intercept, r2, predict: (x) => intercept + slope * x };
  };

  const computeFutureProjections = (currentReport, priorReports) => {
    if (!priorReports || priorReports.length < 2) return null;

    // Build time series: oldest → newest → current
    const allReports = [...priorReports, currentReport];
    const n = allReports.length;

    const salesSeries = allReports.map(r => r.monthly.Rm);
    const profitSeries = allReports.map(r => r.monthly.opProfit);
    const cmSeries = allReports.map(r => r.monthly.cmPct * 100);
    const fcSeries = allReports.map(r => r.monthly.FCm);

    const salesReg = linearRegression(salesSeries);
    const profitReg = linearRegression(profitSeries);
    const cmReg = linearRegression(cmSeries);
    const fcReg = linearRegression(fcSeries);

    if (!salesReg) return null;

    // Project 3 periods forward
    const projections = [1, 2, 3].map(offset => {
      const idx = n - 1 + offset;
      return {
        period: '+' + offset + ' mo',
        sales: Math.round(salesReg.predict(idx)),
        profit: profitReg ? Math.round(profitReg.predict(idx)) : null,
        cmPct: cmReg ? (cmReg.predict(idx) / 100) : null,
        fc: fcReg ? Math.round(fcReg.predict(idx)) : null
      };
    });

    return {
      projections,
      confidence: {
        sales: salesReg.r2,
        profit: profitReg ? profitReg.r2 : null
      },
      historical: {
        labels: allReports.map((_, i) => i < priorReports.length ? 'Month -' + (priorReports.length - i) : 'Current'),
        sales: salesSeries,
        profit: profitSeries
      }
    };
  };

  return {
    toNum, fmtMoney, fmtMoneyCompact, fmtNum, fmtPct, todayStr, timestampStr, clamp,
    validateInputs, computeReport, assessRisk,
    simulateScenario, projectScenario, calcOptimumScenarios,
    computeWCCycle, computeBreakEvenDays, computeDebtFreedom, generateOpportunities,
    computeBizLensScore, computeTrends, runMonteCarlo, computeFutureProjections
  };
})();

const Insights = (() => {
  
  const generateInsights = (report, priorData, thresholds) => {
    if (!report) return { redFlags: [], watchAreas: [], strengths: [], priorityActions: [], nextSteps: [] };
    
    const { monthly: m, bs, health: h, totals: t } = report;
    const thr = thresholds || {};
    
    const redFlags = [];
    const watchAreas = [];
    const strengths = [];
    
    // --- PROFITABILITY ---
    if (m.opProfit < 0) {
      redFlags.push({
        icon: '🔴',
        title: 'Operating Loss',
        body: `Business is incurring a monthly operating loss of ${Finance.fmtMoney(Math.abs(m.opProfit))}. Revenue does not cover costs. Immediate cost reduction or revenue increase is critical.`,
        metric: Finance.fmtMoney(m.opProfit),
        category: 'profitability'
      });
    } else if (m.opPct < 0.05) {
      watchAreas.push({
        icon: '🟠',
        title: 'Thin Profit Margins',
        body: `Operating profit margin is only ${Finance.fmtPct(m.opPct)}. Small revenue drops could push to loss. Focus on improving margins through pricing or cost control.`,
        metric: Finance.fmtPct(m.opPct),
        category: 'profitability'
      });
    } else if (m.opPct >= 0.15) {
      strengths.push({
        icon: '🟢',
        title: 'Strong Profitability',
        body: `Operating profit margin of ${Finance.fmtPct(m.opPct)} indicates healthy cost control and pricing power. This provides a buffer against market fluctuations.`,
        metric: Finance.fmtPct(m.opPct),
        category: 'profitability'
      });
    }
    
    // --- SAFETY / BREAK-EVEN ---
    if (m.mosPct != null && m.mosPct < 0) {
      redFlags.push({
        icon: '🔴',
        title: 'Below Break-Even Point',
        body: `Sales are ${Finance.fmtPct(Math.abs(m.mosPct))} below break-even. Business needs ${Finance.fmtMoney(Math.abs(m.mos))} more monthly sales to cover costs.`,
        metric: Finance.fmtPct(m.mosPct),
        category: 'breakeven'
      });
    } else if (m.mosPct != null && m.mosPct < 0.10) {
      watchAreas.push({
        icon: '🟠',
        title: 'Low Safety Buffer',
        body: `Buffer of ${Finance.fmtPct(m.mosPct)} (${Finance.fmtMoney(m.mos)}) provides limited cushion against revenue fluctuations. Consider strategies to increase this buffer.`,
        metric: Finance.fmtPct(m.mosPct),
        category: 'breakeven'
      });
    } else if (m.mosPct != null && m.mosPct >= 0.25) {
      strengths.push({
        icon: '🟢',
        title: 'Healthy Safety Buffer',
        body: `${Finance.fmtPct(m.mosPct)} buffer means sales could drop by ${Finance.fmtMoney(m.mos)} before hitting break-even. Strong position against market volatility.`,
        metric: Finance.fmtPct(m.mosPct),
        category: 'breakeven'
      });
    }
    
    // --- COST STRUCTURE ---
    if (m.fcPct > 0.40) {
      watchAreas.push({
        icon: '🟠',
        title: 'High Fixed Costs',
        body: `Fixed costs consume ${Finance.fmtPct(m.fcPct)} of revenue. High operating leverage increases vulnerability during downturns. Consider variable cost alternatives.`,
        metric: Finance.fmtPct(m.fcPct),
        category: 'costs'
      });
    } else if (m.fcPct < 0.20 && m.opProfit > 0) {
      strengths.push({
        icon: '🟢',
        title: 'Lean Cost Structure',
        body: `Fixed costs are only ${Finance.fmtPct(m.fcPct)} of revenue, providing flexibility to weather market changes and scale efficiently.`,
        metric: Finance.fmtPct(m.fcPct),
        category: 'costs'
      });
    }
    
    if (m.cmPct < 0.20) {
      redFlags.push({
        icon: '🔴',
        title: 'Low Contribution Margin',
        body: `Contribution margin of ${Finance.fmtPct(m.cmPct)} leaves minimal room to cover fixed costs and generate profit. Review pricing strategy and variable cost structure.`,
        metric: Finance.fmtPct(m.cmPct),
        category: 'costs'
      });
    } else if (m.cmPct >= 0.40) {
      strengths.push({
        icon: '🟢',
        title: 'Strong Contribution Margin',
        body: `${Finance.fmtPct(m.cmPct)} contribution margin shows good pricing power or efficient variable cost management. Strong foundation for profitability.`,
        metric: Finance.fmtPct(m.cmPct),
        category: 'costs'
      });
    }
    
    // --- LIQUIDITY ---
    if (h.cashRunway != null && h.cashRunway < (thr.cashHigh || 3)) {
      redFlags.push({
        icon: '🔴',
        title: 'Critical Cash Position',
        body: `Cash runway of only ${Finance.fmtNum(h.cashRunway)} months. Immediate attention needed to avoid liquidity crisis. Explore credit lines, accelerate collections, or reduce costs.`,
        metric: Finance.fmtNum(h.cashRunway) + ' mo',
        category: 'liquidity'
      });
    } else if (h.cashRunway != null && h.cashRunway < (thr.cashGood || 6)) {
      watchAreas.push({
        icon: '🟠',
        title: 'Limited Cash Runway',
        body: `Cash covers ${Finance.fmtNum(h.cashRunway)} months of fixed costs. Build reserves to at least 6 months for safety against unexpected disruptions.`,
        metric: Finance.fmtNum(h.cashRunway) + ' mo',
        category: 'liquidity'
      });
    } else if (h.cashRunway != null && h.cashRunway >= (thr.cashGood || 6)) {
      strengths.push({
        icon: '🟢',
        title: 'Comfortable Cash Position',
        body: `${Finance.fmtNum(h.cashRunway)} months cash runway provides strong buffer against revenue disruptions and enables strategic investments.`,
        metric: Finance.fmtNum(h.cashRunway) + ' mo',
        category: 'liquidity'
      });
    }
    
    // --- WORKING CAPITAL ---
    if (bs.wc < 0) {
      if (h.wcIntentional) {
        strengths.push({
          icon: '🟢',
          title: 'Strategic Negative Working Capital',
          body: `Negative WC of ${Finance.fmtMoney(bs.wc)} indicates efficient use of supplier credit to fund operations. This is a sign of strong cash cycle management typical of businesses with good supplier terms.`,
          metric: Finance.fmtMoney(bs.wc),
          category: 'liquidity'
        });
      } else {
        watchAreas.push({
          icon: '🟠',
          title: 'Negative Working Capital',
          body: `Working capital of ${Finance.fmtMoney(bs.wc)} indicates payables exceed receivables and inventory. Review if this reflects strategic supplier terms or requires attention.`,
          metric: Finance.fmtMoney(bs.wc),
          category: 'liquidity'
        });
      }
    } else if (bs.wcSalesRatio > (thr.wcSalesHigh || 40)) {
      watchAreas.push({
        icon: '🟠',
        title: 'High Working Capital Requirement',
        body: `Working capital of ${Finance.fmtMoney(bs.wc)} (${Finance.fmtNum(bs.wcSalesRatio)}% of monthly sales) ties up significant cash in operations. Consider ways to optimize inventory and collections.`,
        metric: Finance.fmtNum(bs.wcSalesRatio) + '%',
        category: 'liquidity'
      });
    }
    
    // --- LEVERAGE ---
    if (h.isDebtFree) {
      strengths.push({
        icon: '🟢',
        title: 'Debt-Free Business',
        body: 'The business operates with zero debt, providing maximum financial flexibility, eliminating default risk, and allowing all profits to be retained or reinvested.',
        metric: '0 Debt',
        category: 'leverage'
      });
    } else if (h.deRatio != null && h.deRatio > (thr.deLow || 2)) {
      redFlags.push({
        icon: '🔴',
        title: 'High Leverage',
        body: `Debt-Equity ratio of ${Finance.fmtNum(h.deRatio)}× indicates high financial risk. Creditors have more stake than owners. Prioritize debt reduction.`,
        metric: Finance.fmtNum(h.deRatio) + '×',
        category: 'leverage'
      });
    } else if (h.deRatio != null && h.deRatio > (thr.deHigh || 1)) {
      watchAreas.push({
        icon: '🟠',
        title: 'Moderate Leverage',
        body: `Debt-Equity of ${Finance.fmtNum(h.deRatio)}× is manageable but reduces financial flexibility. Monitor debt levels closely.`,
        metric: Finance.fmtNum(h.deRatio) + '×',
        category: 'leverage'
      });
    } else if (h.deRatio != null && h.deRatio <= (thr.deHigh || 1)) {
      strengths.push({
        icon: '🟢',
        title: 'Conservative Capital Structure',
        body: `Low Debt-Equity of ${Finance.fmtNum(h.deRatio)}× provides financial stability and flexibility for future growth or weathering downturns.`,
        metric: Finance.fmtNum(h.deRatio) + '×',
        category: 'leverage'
      });
    }
    
    // --- INTEREST COVERAGE ---
    if (h.isInterestFree) {
      strengths.push({
        icon: '🟢',
        title: 'No Interest Burden',
        body: 'The business has zero interest obligations. All operating profit is available for reinvestment, distributions, or building reserves.',
        metric: 'Rs. 0',
        category: 'leverage'
      });
    } else if (h.icr != null && h.icr < (thr.icrHigh || 1.5)) {
      redFlags.push({
        icon: '🔴',
        title: 'Weak Debt Servicing',
        body: `Interest coverage of ${Finance.fmtNum(h.icr)}× means profits barely cover interest payments. Risk of default if revenues decline.`,
        metric: Finance.fmtNum(h.icr) + '×',
        category: 'leverage'
      });
    } else if (h.icr != null && h.icr < (thr.icrLow || 3)) {
      watchAreas.push({
        icon: '🟠',
        title: 'Tight Interest Coverage',
        body: `ICR of ${Finance.fmtNum(h.icr)}× leaves limited buffer for profit decline before debt stress. Aim for ICR above 3×.`,
        metric: Finance.fmtNum(h.icr) + '×',
        category: 'leverage'
      });
    } else if (h.icr != null && h.icr >= (thr.icrLow || 3)) {
      strengths.push({
        icon: '🟢',
        title: 'Strong Interest Coverage',
        body: `ICR of ${Finance.fmtNum(h.icr)}× indicates comfortable debt servicing capacity with room for profit fluctuations.`,
        metric: Finance.fmtNum(h.icr) + '×',
        category: 'leverage'
      });
    }
    
    // --- CONCENTRATION ---
    if (h.topCust != null && h.topCust > (thr.concHigh || 50)) {
      redFlags.push({
        icon: '🔴',
        title: 'High Customer Concentration',
        body: `Top customers account for ${Finance.fmtNum(h.topCust)}% of sales. Loss of a key customer would be devastating. Actively diversify customer base.`,
        metric: Finance.fmtNum(h.topCust) + '%',
        category: 'concentration'
      });
    } else if (h.topCust != null && h.topCust > (thr.concMed || 30)) {
      watchAreas.push({
        icon: '🟠',
        title: 'Moderate Customer Concentration',
        body: `${Finance.fmtNum(h.topCust)}% revenue from top customers. Work on diversifying customer base to reduce dependency.`,
        metric: Finance.fmtNum(h.topCust) + '%',
        category: 'concentration'
      });
    } else if (h.topCust != null && h.topCust <= (thr.concMed || 30)) {
      strengths.push({
        icon: '🟢',
        title: 'Diversified Customer Base',
        body: `Top customers account for only ${Finance.fmtNum(h.topCust)}% of sales. Well-diversified revenue reduces single-customer risk.`,
        metric: Finance.fmtNum(h.topCust) + '%',
        category: 'concentration'
      });
    }
    
    if (h.topSupp != null && h.topSupp > (thr.concHigh || 50)) {
      redFlags.push({
        icon: '🔴',
        title: 'High Supplier Dependency',
        body: `${Finance.fmtNum(h.topSupp)}% of purchases from top suppliers. Supply chain risk is elevated. Develop alternative suppliers.`,
        metric: Finance.fmtNum(h.topSupp) + '%',
        category: 'concentration'
      });
    } else if (h.topSupp != null && h.topSupp > (thr.concMed || 30)) {
      watchAreas.push({
        icon: '🟠',
        title: 'Moderate Supplier Concentration',
        body: `${Finance.fmtNum(h.topSupp)}% purchases from top suppliers. Consider developing backup suppliers.`,
        metric: Finance.fmtNum(h.topSupp) + '%',
        category: 'concentration'
      });
    }
    
    // --- AGEING ---
    if (!h.arAgeing) {
      watchAreas.push({
        icon: '🟠',
        title: 'Receivables Not Tracked',
        body: 'Debtors ageing not maintained. Collection risks not visible. Implement ageing analysis for better cash flow management.',
        metric: 'N/A',
        category: 'discipline'
      });
    } else {
      const arTotal = h.arAgeing.d0_30 + h.arAgeing.d31_60 + h.arAgeing.d61_90 + h.arAgeing.d90p;
      const over90Pct = arTotal > 0 ? (h.arAgeing.d90p / arTotal) * 100 : 0;
      const over60Pct = arTotal > 0 ? (h.arAgeing.d61_90 / arTotal) * 100 : 0;
      if (over90Pct > 20) {
        redFlags.push({
          icon: '🔴',
          title: 'Poor Collection Discipline',
          body: `${Finance.fmtNum(over90Pct)}% of receivables are over 90 days old. Significant collection risk. Implement stricter credit policies and aggressive follow-up.`,
          metric: Finance.fmtNum(over90Pct) + '%',
          category: 'discipline'
        });
      } else if (over90Pct > 10 || over60Pct > 25) {
        watchAreas.push({
          icon: '🟠',
          title: 'Elevated Receivables Ageing',
          body: `${Finance.fmtNum(over90Pct)}% over 90 days, ${Finance.fmtNum(over60Pct)}% in 60-90 day bucket. Review credit terms and follow-up process.`,
          metric: Finance.fmtNum(over90Pct) + '% 90+',
          category: 'discipline'
        });
      } else {
        strengths.push({
          icon: '🟢',
          title: 'Strong Collection Discipline',
          body: `Only ${Finance.fmtNum(over90Pct)}% of receivables over 90 days. Effective credit management supports healthy cash flow.`,
          metric: Finance.fmtNum(over90Pct) + '%',
          category: 'discipline'
        });
      }
    }
    
    if (!h.apAgeing) {
      watchAreas.push({
        icon: '🟠',
        title: 'Payables Not Tracked',
        body: 'Creditors ageing not maintained. Supplier relationships not monitored. Track payables to optimize payment timing.',
        metric: 'N/A',
        category: 'discipline'
      });
    } else {
      const apTotal = h.apAgeing.d0_30 + h.apAgeing.d31_60 + h.apAgeing.d61_90 + h.apAgeing.d90p;
      const apOver90Pct = apTotal > 0 ? (h.apAgeing.d90p / apTotal) * 100 : 0;
      if (apOver90Pct > 30 && !h.apStrategic) {
        redFlags.push({
          icon: '🔴',
          title: 'High Overdue Payables',
          body: `${Finance.fmtNum(apOver90Pct)}% of payables are over 90 days. Risk of damaged supplier relationships and supply disruption.`,
          metric: Finance.fmtNum(apOver90Pct) + '%',
          category: 'discipline'
        });
      } else if (apOver90Pct > 15 && !h.apStrategic) {
        watchAreas.push({
          icon: '🟠',
          title: 'Elevated Payables Ageing',
          body: `${Finance.fmtNum(apOver90Pct)}% of payables over 90 days may strain supplier relationships.`,
          metric: Finance.fmtNum(apOver90Pct) + '%',
          category: 'discipline'
        });
      } else if (h.apStrategic && apOver90Pct > 15) {
        strengths.push({
          icon: '🟢',
          title: 'Strategic Supplier Terms',
          body: `Extended payment terms (${Finance.fmtNum(apOver90Pct)}% over 90 days) are negotiated, optimizing cash flow without relationship risk.`,
          metric: Finance.fmtNum(apOver90Pct) + '%',
          category: 'discipline'
        });
      }
    }
    
    // --- NETWORTH ---
    if (bs.realNetworth != null) {
      const equity = bs.eq || 0;
      const ratio = equity > 0 ? ((bs.realNetworth - equity) / equity) * 100 : null;
      
      if (bs.realNetworth <= 0) {
        redFlags.push({
          icon: '🔴',
          title: 'Negative Networth',
          body: `Real networth is negative at ${Finance.fmtMoney(bs.realNetworth)}. Liabilities currently exceed assets. Focus on building asset base and improving profitability.`,
          metric: Finance.fmtMoney(bs.realNetworth),
          category: 'networth'
        });
      } else if (equity > 0 && bs.realNetworth < equity * 0.975) {
        watchAreas.push({
          icon: '🟠',
          title: 'Networth Below Equity',
          body: `Real networth (${Finance.fmtMoney(bs.realNetworth)}) is below invested equity (${Finance.fmtMoney(equity)}). A gap of ${Finance.fmtPct(Math.abs(ratio) / 100)} indicates some value erosion that may recover with improved performance.`,
          metric: Finance.fmtPct(ratio / 100),
          category: 'networth'
        });
      } else if (equity > 0 && bs.realNetworth <= equity * 1.025) {
        watchAreas.push({
          icon: '🟠',
          title: 'Networth At Par',
          body: `Real networth (${Finance.fmtMoney(bs.realNetworth)}) is at par with invested equity. Capital has been preserved with opportunity for further value creation.`,
          metric: 'At Par',
          category: 'networth'
        });
      } else if (ratio != null && ratio >= 50) {
        strengths.push({
          icon: '🟢',
          title: 'Strong Value Creation',
          body: `Real networth exceeds equity by ${Finance.fmtPct(ratio / 100)}. Business has created substantial value beyond the original investment of ${Finance.fmtMoney(equity)}.`,
          metric: '+' + Finance.fmtPct(ratio / 100),
          category: 'networth'
        });
      } else if (ratio != null && ratio >= 25) {
        strengths.push({
          icon: '🟢',
          title: 'Healthy Value Creation',
          body: `Real networth exceeds equity by ${Finance.fmtPct(ratio / 100)}. Business has generated good returns above invested capital.`,
          metric: '+' + Finance.fmtPct(ratio / 100),
          category: 'networth'
        });
      }
    }
    
    // --- PRIOR PERIOD TRENDS ---
    if (priorData) {
      const priorSales = Finance.toNum(priorData.priorSales);
      const priorOp = Finance.toNum(priorData.priorOpProfit);
      
      if (priorSales && m.Rm) {
        const salesGrowth = ((m.Rm - priorSales) / priorSales) * 100;
        if (salesGrowth < -10) {
          redFlags.push({
            icon: '🔴',
            title: 'Declining Sales',
            body: `Sales have declined ${Finance.fmtNum(Math.abs(salesGrowth))}% compared to prior period. Investigate root causes and take corrective action.`,
            metric: Finance.fmtNum(salesGrowth) + '%',
            category: 'trends'
          });
        } else if (salesGrowth > 20) {
          strengths.push({
            icon: '🟢',
            title: 'Strong Sales Growth',
            body: `Sales have grown ${Finance.fmtNum(salesGrowth)}% compared to prior period. Positive momentum to build on.`,
            metric: '+' + Finance.fmtNum(salesGrowth) + '%',
            category: 'trends'
          });
        }
      }
    }
    
    // --- GENERATE PRIORITY ACTIONS (more detailed) ---
    const priorityActions = [];
    
    redFlags.forEach(r => {
      let actionText = r.title + ': ';
      switch(r.category) {
        case 'profitability':
          actionText += 'Review pricing strategy, reduce non-essential costs, and identify revenue growth opportunities within 30 days.';
          break;
        case 'breakeven':
          actionText += 'Develop a 90-day plan to increase sales volume or reduce variable costs to reach break-even.';
          break;
        case 'liquidity':
          actionText += 'Immediately review cash flow, accelerate receivables collection, negotiate extended payment terms with suppliers.';
          break;
        case 'leverage':
          actionText += 'Create a debt reduction plan, prioritize high-interest debt, and avoid new borrowing.';
          break;
        case 'concentration':
          actionText += 'Develop a customer/supplier diversification strategy within 60 days.';
          break;
        case 'discipline':
          actionText += 'Implement weekly ageing review and follow-up process for overdue accounts.';
          break;
        case 'networth':
          actionText += 'Focus on profit retention and asset optimization to rebuild equity.';
          break;
        default:
          actionText += r.body.split('.')[0] + '.';
      }
      priorityActions.push({ text: actionText, urgency: 'urgent' });
    });
    
    watchAreas.slice(0, Math.max(0, 5 - priorityActions.length)).forEach(w => {
      priorityActions.push({ text: w.title + ': Monitor closely and develop contingency plan.', urgency: 'important' });
    });
    
    // --- GENERATE NEXT STEPS (more detailed and specific) ---
    const nextSteps = [];
    
    if (m.opProfit <= 0) {
      nextSteps.push('Conduct a detailed cost analysis to identify immediate savings opportunities - target 10-15% reduction in discretionary spending.');
      nextSteps.push('Review top 10 customers to identify upsell/cross-sell opportunities to increase revenue.');
    }
    
    if (h.cashRunway != null && h.cashRunway < (thr.cashHigh || 3)) {
      nextSteps.push('Prepare 13-week cash flow forecast and update weekly. Identify minimum cash needs.');
      nextSteps.push('Explore working capital financing options (invoice factoring, line of credit) as safety net.');
    }
    
    if (h.deRatio != null && h.deRatio > (thr.deLow || 2)) {
      nextSteps.push('Create a debt amortization schedule and identify opportunities for early repayment or refinancing.');
    }
    
    if (h.topCust != null && h.topCust > (thr.concHigh || 50)) {
      nextSteps.push('Develop a customer acquisition strategy targeting 3-5 new accounts in the next quarter.');
    }
    
    if (!h.arAgeing) {
      nextSteps.push('Implement receivables ageing tracking system this week - categorize by 0-30, 31-60, 61-90, and 90+ days.');
    }
    
    if (!h.apAgeing) {
      nextSteps.push('Set up payables ageing tracking to optimize payment timing and maintain supplier relationships.');
    }
    
    if (m.mosPct != null && m.mosPct < 0.15 && m.mosPct >= 0) {
      nextSteps.push('Analyze product/service mix to identify high-margin offerings and focus marketing efforts there.');
    }
    
    // Default steps if none generated
    if (nextSteps.length === 0) {
      nextSteps.push('Continue monitoring key financial metrics weekly and review full dashboard monthly.');
      nextSteps.push('Set quarterly targets for improving weakest 2-3 indicators.');
      nextSteps.push('Schedule quarterly business review to track progress against financial goals.');
    }
    
    return { 
      redFlags, 
      watchAreas, 
      strengths, 
      priorityActions,
      nextSteps
    };
  };
  
  const generateExecutiveSummary = (report, insights, thresholds, clientName) => {
    if (!report) return null;
    
    const { monthly: m, bs, health: h, totals: t } = report;
    const thr = thresholds || {};
    
    // Calculate overall health (debt-free = NOT a risk)
    const badCount = [
      h.cashRunway != null && h.cashRunway < (thr.cashHigh || 3),
      !h.isDebtFree && h.deRatio != null && h.deRatio > (thr.deLow || 2),
      !h.isInterestFree && h.icr != null && h.icr < (thr.icrHigh || 1.5),
      m.opProfit <= 0,
      m.mosPct != null && m.mosPct < 0.08
    ].filter(Boolean).length;
    
    const overallHealth = badCount >= 3 ? 'bad' : badCount >= 1 ? 'medium' : 'good';
    const healthLabel = overallHealth === 'good' ? '🟢 HEALTHY' : overallHealth === 'medium' ? '🟠 NEEDS ATTENTION' : '🔴 AT RISK';
    
    // Key metrics with status
    const keyMetrics = [
      { label: 'Monthly Sales', value: Finance.fmtMoney(m.Rm), status: '' },
      { label: 'Operating Profit', value: Finance.fmtMoney(m.opProfit), status: m.opProfit > 0 ? 'good' : 'bad' },
      { label: 'Profit Margin', value: Finance.fmtPct(m.opPct), status: m.opPct >= 0.10 ? 'good' : m.opPct < 0 ? 'bad' : '' },
      { label: 'Safety Buffer', value: Finance.fmtPct(m.mosPct), status: m.mosPct >= 0.15 ? 'good' : m.mosPct < 0 ? 'bad' : '' },
      { label: 'Cash Runway', value: h.cashRunway != null ? Finance.fmtNum(h.cashRunway) + ' mo' : '—', status: h.cashRunway >= (thr.cashGood || 6) ? 'good' : h.cashRunway < (thr.cashHigh || 3) ? 'bad' : '' },
      { label: 'Debt-Equity', value: h.isDebtFree ? 'Debt-Free ✓' : (h.deRatio != null ? Finance.fmtNum(h.deRatio) + '×' : '—'), status: h.isDebtFree ? 'good' : (h.deRatio != null && h.deRatio < (thr.deHigh || 1) ? 'good' : h.deRatio > (thr.deLow || 2) ? 'bad' : '') }
    ];
    
    // Operating highlights for summary
    const operatingHighlights = [
      { label: 'Total Revenue', value: Finance.fmtMoney(t.R), period: t.M + ' months' },
      { label: 'Total Operating Profit', value: Finance.fmtMoney(t.opTotal), status: t.opTotal > 0 ? 'good' : 'bad' },
      { label: 'Actual P&L', value: Finance.fmtMoney(t.actualPL), status: t.actualPL > 0 ? 'good' : 'bad' },
      { label: 'Contribution Margin', value: Finance.fmtPct(m.cmPct), status: m.cmPct >= 0.30 ? 'good' : m.cmPct < 0.20 ? 'bad' : '' },
      { label: 'Break-Even Point', value: Finance.fmtMoney(m.beSales) + '/mo' },
      { label: 'Fixed Cost Ratio', value: Finance.fmtPct(m.fcPct), status: m.fcPct < 0.25 ? 'good' : m.fcPct > 0.40 ? 'bad' : '' }
    ];
    
    // Health snapshot for summary
    const healthSnapshot = [
      { 
        indicator: 'Liquidity', 
        value: h.cashRunway != null ? Finance.fmtNum(h.cashRunway) + ' months runway' : 'N/A',
        status: Finance.assessRisk(h.cashRunway, thr, 'cashRunway').level,
        details: `Cash: ${Finance.fmtMoney(bs.cash)}`
      },
      { 
        indicator: 'Leverage', 
        value: h.isDebtFree ? 'Debt-Free ✓' : (h.deRatio != null ? Finance.fmtNum(h.deRatio) + '× D/E' : 'N/A'),
        status: h.isDebtFree ? 'good' : Finance.assessRisk(h.deRatio, thr, 'deRatio', { isDebtFree: h.isDebtFree }).level,
        details: h.isDebtFree ? 'No debt obligations' : `Debt: ${Finance.fmtMoney(bs.totalDebt)}`
      },
      { 
        indicator: 'Interest Coverage', 
        value: h.isInterestFree ? 'No Interest ✓' : (h.icr != null ? Finance.fmtNum(h.icr) + '× ICR' : 'N/A'),
        status: h.isInterestFree ? 'good' : Finance.assessRisk(h.icr, thr, 'icr', { isInterestFree: h.isInterestFree }).level,
        details: h.isInterestFree ? 'No interest obligations' : `Op Profit covers interest ${h.icr != null ? Finance.fmtNum(h.icr) : '—'}×`
      },
      { 
        indicator: 'Working Capital', 
        value: Finance.fmtMoney(bs.wc),
        status: Finance.assessRisk(bs.wcSalesRatio, thr, 'wcSales').level,
        details: `${Finance.fmtNum(bs.wcSalesRatio)}% of monthly sales`
      },
      { 
        indicator: 'Real Networth', 
        value: bs.realNetworth != null ? Finance.fmtMoney(bs.realNetworth) : 'N/A',
        status: Finance.assessRisk(bs.realNetworth, thr, 'networth').level,
        details: 'Assets minus Liabilities'
      }
    ];
    
    // Auto-generate opportunities
    const opportunities = Finance.generateOpportunities ? Finance.generateOpportunities(report) : [];
    
    return {
      clientName: clientName || 'Business',
      date: Finance.todayStr(),
      period: t.M + ' months',
      overallHealth,
      healthLabel,
      keyMetrics,
      redFlagsCount: insights.redFlags.length,
      watchAreasCount: insights.watchAreas.length,
      strengthsCount: insights.strengths.length,
      priorityActions: insights.priorityActions,
      nextSteps: insights.nextSteps,
      categorizedInsights: {
        redFlags: insights.redFlags,
        watchAreas: insights.watchAreas,
        strengths: insights.strengths
      },
      opportunities,
      totals: t,
      monthly: m,
      bs: bs,
      health: h
    };
  };

  return {
    generateInsights,
    generateExecutiveSummary
  };
})();

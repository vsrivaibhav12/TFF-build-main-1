const UI = (() => {
  const $ = (id) => document.getElementById(id);
  
  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', 
      "'": '&#39;', '"': '&quot;'
    })[c]);
  };
  
  const toast = (message, type = 'info', duration = 3000) => {
    const container = $('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), duration);
  };
  
  const showLoading = (show = true, text = 'Processing...') => {
    const overlay = $('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
      const textEl = overlay.querySelector('.loading-text');
      if (textEl) textEl.textContent = text;
    }
  };
  
  const setText = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text == null ? '--' : text;
  };
  
  const setHtml = (id, html) => {
    const el = $(id);
    if (el) el.innerHTML = html;
  };
  
  const setTagProminent = (id, risk) => {
    const el = $(id);
    if (!el) return;
    el.textContent = risk.label;
    el.className = 'health-card-tag-prominent tag-' + risk.level;
  };
  
  const setTrend = (id, pct, invert = false) => {
    const el = $(id);
    if (!el || pct == null || isNaN(pct)) {
      if (el) el.style.display = 'none';
      return;
    }
    el.style.display = 'inline-block';
    const good = invert ? (pct <= 0) : (pct >= 0);
    el.className = 'kpi-trend ' + (good ? 'up' : 'down');
    el.textContent = (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct).toFixed(1) + '%';
  };
  
  const renderOperatingDashboard = (report, priorData) => {
    if (!report) return;
    const { monthly: m, totals: t } = report;
    
    // Sales
    setText('cSalesM', Finance.fmtMoney(m.Rm));
    setText('cSalesT', 'Total: ' + Finance.fmtMoney(t.R));
    
    // Variable Costs
    setText('cVCM', Finance.fmtMoney(m.VCm));
    setText('cVCT', 'Total: ' + Finance.fmtMoney(t.VC));
    
    // Fixed Costs with % tag
    setText('cFCM', Finance.fmtMoney(m.FCm));
    setText('cFCT', 'Total: ' + Finance.fmtMoney(t.FC));
    
    // Add FC % tag to Fixed Costs card
    const fcCard = $('cFCM')?.closest('.kpi-card');
    if (fcCard) {
      // Remove any existing tag
      const existingTag = fcCard.querySelector('.kpi-pct-tag');
      if (existingTag) existingTag.remove();
      
      // Add new tag
      const fcPctTag = document.createElement('span');
      fcPctTag.className = 'kpi-pct-tag';
      fcPctTag.textContent = Finance.fmtPct(m.fcPct);
      fcCard.querySelector('.kpi-header').appendChild(fcPctTag);
    }
    
    // Contribution Margin
    setText('cCM', Finance.fmtPct(m.cmPct));
    setText('cCMSub', Finance.fmtMoney(m.contribution) + ' after variable costs');
    
    // Break-Even
    setText('cBE', Finance.fmtMoney(m.beSales));
    
    // Margin of Safety
    setText('cMoS', Finance.fmtMoney(m.mos));
    setText('cMoSSub', Finance.fmtPct(m.mosPct) + ' of sales');
    
    const mosFill = $('mosFill');
    if (mosFill && m.mosPct != null) {
      const pct = Finance.clamp(m.mosPct * 100, 0, 100);
      mosFill.style.width = pct + '%';
      mosFill.classList.toggle('bad', pct < 10);
    }
    
    // Operating Profit with % tag and color coding
    const opEl = $('cOpM');
    const opCard = opEl?.closest('.kpi-card');
    
    if (opEl) {
      opEl.textContent = Finance.fmtMoney(m.opProfit);
      // Color the value based on profit/loss
      if (m.opProfit < 0) {
        opEl.style.color = 'var(--rose)';
      } else {
        opEl.style.color = 'var(--teal)';
      }
    }
    
    // Update operating profit sub text with colored percentage
    const opPctEl = $('cOpPct');
    if (opPctEl) {
      opPctEl.textContent = Finance.fmtPct(m.opPct);
      opPctEl.style.color = m.opProfit < 0 ? 'var(--rose)' : 'var(--teal)';
    }
    
    // Add Profit % tag to Operating Profit card
    if (opCard) {
      // Remove any existing tag
      const existingTag = opCard.querySelector('.kpi-pct-tag');
      if (existingTag) existingTag.remove();
      
      // Add new tag with color
      const opPctTag = document.createElement('span');
      opPctTag.className = 'kpi-pct-tag ' + (m.opProfit >= 0 ? 'tag-profit' : 'tag-loss');
      opPctTag.textContent = Finance.fmtPct(m.opPct);
      opCard.querySelector('.kpi-header').appendChild(opPctTag);
    }
    
    // Actual P&L
    const plEl = $('cPLT');
    if (plEl) {
      plEl.textContent = Finance.fmtMoney(t.actualPL);
      plEl.style.color = t.actualPL < 0 ? 'var(--rose)' : 'var(--teal)';
    }
    setText('cPLSub', 'Op: ' + Finance.fmtMoney(t.opTotal) + ' + Inv: ' + Finance.fmtMoney(t.INV) + ' + OI: ' + Finance.fmtMoney(t.OI) + ' - NC: ' + Finance.fmtMoney(t.NC));
    
    // Prior period trends
    if (priorData) {
      const ps = Finance.toNum(priorData.priorSales);
      const pvc = Finance.toNum(priorData.priorVC);
      const pfc = Finance.toNum(priorData.priorFC);
      const pop = Finance.toNum(priorData.priorOpProfit);
      
      if (ps && m.Rm) setTrend('cSalesTrend', ((m.Rm - ps) / ps) * 100, false);
      if (pvc && m.VCm) setTrend('cVCTrend', ((m.VCm - pvc) / pvc) * 100, true);
      if (pfc && m.FCm) setTrend('cFCTrend', ((m.FCm - pfc) / pfc) * 100, true);
      if (pop && m.opProfit != null) setTrend('cOpTrend', ((m.opProfit - pop) / Math.max(1, Math.abs(pop))) * 100, false);
    }
  };
  
  const renderSimulatorResults = (scenario, baseReport) => {
    if (!scenario || !baseReport) return;
    
    setText('sCM', Finance.fmtPct(scenario.cmPct));
    setText('sCMSub', 'Contribution: ' + Finance.fmtMoney(scenario.contribution));
    setText('sBE', Finance.fmtMoney(scenario.be));
    setText('sBESub', 'Monthly minimum');
    setText('sMoS', Finance.fmtMoney(scenario.mos));
    setText('sMoSSub', Finance.fmtPct(scenario.mosPct));
    
    const sMosFill = $('sMosFill');
    if (sMosFill && scenario.mosPct != null) {
      const pct = Finance.clamp(scenario.mosPct * 100, 0, 100);
      sMosFill.style.width = pct + '%';
    }
    
    // Simulator profit with color
    const sOpEl = $('sOp');
    if (sOpEl) {
      sOpEl.textContent = Finance.fmtMoney(scenario.op);
      sOpEl.style.color = scenario.op < 0 ? 'var(--rose)' : 'var(--teal)';
    }
    
    setText('sSalesT', Finance.fmtMoney(scenario.totalSales));
    setText('sSalesSub', 'Original: ' + Finance.fmtMoney(baseReport.totals.R));
    
    const delta = scenario.op - baseReport.monthly.opProfit;
    const deltaEl = $('sDelta');
    if (deltaEl) {
      deltaEl.textContent = Finance.fmtMoney(delta);
      deltaEl.style.color = delta < 0 ? 'var(--rose)' : 'var(--teal)';
    }
    setText('sDeltaSub', delta >= 0 ? 'Improvement' : 'Decline');
    
    // === Balance Sheet / Working Capital Impact ===
    const impactContainer = $('simBSImpact');
    if (impactContainer && scenario.bsImpact) {
      const bi = scenario.bsImpact;
      const hasImpact = Math.abs(bi.wcChange) > 100;
      
      if (hasImpact) {
        impactContainer.style.display = 'block';
        const wcDir = bi.wcChange > 0 ? 'increase' : 'decrease';
        const needsDebt = bi.additionalDebtNeeded > 0;
        
        impactContainer.innerHTML = `
          <div class="sim-impact-title">📊 Balance Sheet Impact (Estimated)</div>
          <div class="sim-impact-grid">
            <div class="sim-impact-item">
              <span class="sim-impact-label">Working Capital Change</span>
              <span class="sim-impact-value ${bi.wcChange > 0 ? 'warn' : 'good'}">${bi.wcChange > 0 ? '+' : ''}${Finance.fmtMoney(bi.wcChange)}</span>
            </div>
            <div class="sim-impact-item">
              <span class="sim-impact-label">AR Change</span>
              <span class="sim-impact-value">${bi.estARChange > 0 ? '+' : ''}${Finance.fmtMoney(bi.estARChange)}</span>
            </div>
            <div class="sim-impact-item">
              <span class="sim-impact-label">Inventory Change</span>
              <span class="sim-impact-value">${bi.estInvChange > 0 ? '+' : ''}${Finance.fmtMoney(bi.estInvChange)}</span>
            </div>
            <div class="sim-impact-item">
              <span class="sim-impact-label">AP Change</span>
              <span class="sim-impact-value">${bi.estAPChange > 0 ? '+' : ''}${Finance.fmtMoney(bi.estAPChange)}</span>
            </div>
            ${needsDebt ? `
              <div class="sim-impact-item sim-impact-warn">
                <span class="sim-impact-label">⚠️ Additional Financing Needed</span>
                <span class="sim-impact-value warn">${Finance.fmtMoney(bi.additionalDebtNeeded)}</span>
              </div>
              <div class="sim-impact-item">
                <span class="sim-impact-label">Est. Interest on New Debt</span>
                <span class="sim-impact-value warn">-${Finance.fmtMoney(bi.interestOnNewDebt)}/mo</span>
              </div>
              <div class="sim-impact-item">
                <span class="sim-impact-label">Adjusted Profit (after WC cost)</span>
                <span class="sim-impact-value ${bi.adjustedOp >= 0 ? 'good' : 'bad'}">${Finance.fmtMoney(bi.adjustedOp)}/mo</span>
              </div>
            ` : `
              <div class="sim-impact-item">
                <span class="sim-impact-label">Net Cash Flow Impact</span>
                <span class="sim-impact-value ${bi.cashFlowImpact >= 0 ? 'good' : 'warn'}">${bi.cashFlowImpact > 0 ? '+' : ''}${Finance.fmtMoney(bi.cashFlowImpact)}</span>
              </div>
            `}
          </div>
          <div class="sim-impact-note">
            ${bi.wcChange > 0 
              ? `⚠️ This scenario requires ~${Finance.fmtMoney(bi.wcChange)} additional working capital to support the ${wcDir} in operations.`
              : `✓ This scenario frees up ~${Finance.fmtMoney(Math.abs(bi.wcChange))} from working capital.`
            }
          </div>
          <div class="sim-impact-assumptions">Assumes: AR, inventory scale with sales; AP scales with purchases; new debt at 12% p.a.</div>
        `;
      } else {
        impactContainer.style.display = 'none';
      }
    } else if (impactContainer) {
      impactContainer.style.display = 'none';
    }
    
    [1, 6, 12].forEach(months => {
      const p = Finance.projectScenario(scenario, months);
      setText('p' + months + 'Sales', Finance.fmtMoney(p?.sales));

      const pOpEl = $('p' + months + 'Op');
      if (pOpEl && p) {
        pOpEl.textContent = Finance.fmtMoney(p.op);
        pOpEl.style.color = p.op < 0 ? 'var(--rose)' : 'var(--teal)';
      }

      setText('p' + months + 'MoS', Finance.fmtMoney(p?.mos));
      setText('p' + months + 'Note', p ? 'No Profit No Loss: ' + Finance.fmtMoney(p.be) + ' | Safety: ' + Finance.fmtPct(p.mosPct) : '—');
    });
  };
  
  const renderOptimumScenarios = (result, baseMonthly) => {
    const container = $('optResults');
    const warn = $('optWarn');
    const note = $('oNote');
    
    if (!result.feasible) {
      if (warn) {
        warn.textContent = '💡 ' + result.reason;
        warn.style.display = 'block';
      }
      if (container) container.innerHTML = '';
      if (note) note.textContent = '';
      return;
    }
    
    if (warn) warn.style.display = 'none';
    
    const fmtDelta = d => {
      if (d == null) return '—';
      if (Math.abs(d) < 100) return 'No change';
      return (d >= 0 ? '+' : '') + Finance.fmtMoney(d);
    };
    
    if (container) {
      container.innerHTML = result.scenarios.map(sc => `
        <div class="opt-card ${sc.feasible ? '' : 'not-feasible'}">
          <div class="opt-card-title">
            ${escapeHtml(sc.id)}. ${escapeHtml(sc.title)}
            ${sc.feasible ? '' : '<span class="opt-card-not-feasible-badge">Not Feasible</span>'}
          </div>
          <div class="opt-card-desc">${escapeHtml(sc.desc)}</div>
          <div class="opt-grid">
            <div class="opt-item">
              <div class="opt-item-label">Sales</div>
              <div class="opt-item-value">${sc.sales != null ? Finance.fmtMoney(sc.sales) : '—'}</div>
              <div class="opt-item-delta">${fmtDelta(sc.deltaSales)}</div>
            </div>
            <div class="opt-item">
              <div class="opt-item-label">Variable</div>
              <div class="opt-item-value">${sc.vc != null ? Finance.fmtMoney(sc.vc) : '—'}</div>
              <div class="opt-item-delta">${fmtDelta(sc.deltaVC)}</div>
            </div>
            <div class="opt-item">
              <div class="opt-item-label">Fixed</div>
              <div class="opt-item-value">${sc.fc != null ? Finance.fmtMoney(sc.fc) : '—'}</div>
              <div class="opt-item-delta">${fmtDelta(sc.deltaFC)}</div>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    if (note) {
      note.textContent = 'Target: ' + Finance.fmtMoney(result.targetMonthly) + '/month | Current CM: ' + Finance.fmtPct(baseMonthly.cmPct);
    }
  };
  
  const renderHealthSection = (report, thresholds) => {
    if (!report) return;
    const { monthly: m, bs, health: h } = report;
    const thr = thresholds;
    
    let riskCount = { good: 0, medium: 0, bad: 0 };
    const addRisk = (level) => riskCount[level]++;
    
    // === LIQUIDITY SECTION ===
    const cashRisk = Finance.assessRisk(h.cashRunway, thr, 'cashRunway');
    addRisk(cashRisk.level);
    
    setText('cashRunwayMonths', h.cashRunway != null ? Finance.fmtNum(h.cashRunway) : '—');
    
    const formulaEl = $('liquidityFormula');
    if (formulaEl) {
      formulaEl.innerHTML = `<span class="base-data">Cash: <strong>${Finance.fmtMoney(bs.cash)}</strong> | Monthly Outflow: <strong>${Finance.fmtMoney(h.stressOutflow)}</strong></span>`;
    }
    
    if (h.cashRunway != null) {
      setText('liquidityInterpretation', 
        h.cashRunway < thr.cashHigh ? 'High short-term liquidity risk. Immediate attention needed.' :
        h.cashRunway < thr.cashGood ? 'Moderate liquidity position. Consider building cash reserves.' :
        'Comfortable cash position to handle operations.'
      );
    }
    
    const runwayFill = $('runwayFill');
    if (runwayFill && h.cashRunway != null) {
      const width = Math.min(100, (h.cashRunway / 10) * 100);
      runwayFill.style.width = width + '%';
    }
    setTagProminent('liquidityTag', cashRisk);
    
    // === WORKING CAPITAL ===
    const wcRisk = Finance.assessRisk(bs.wcSalesRatio, thr, 'wcSales', { wc: bs.wc, wcIntentional: h.wcIntentional });
    addRisk(wcRisk.level);
    
    setText('wcAR', Finance.fmtMoney(bs.ar));
    setText('wcInv', Finance.fmtMoney(bs.inv));
    setText('wcAP', Finance.fmtMoney(bs.ap));
    setText('wcNet', Finance.fmtMoney(bs.wc));
    
    // Show/hide WC toggle based on whether WC is negative
    const wcToggleWrap = $('wcToggleWrap');
    const wcIntentionalEl = $('wcIntentional');
    if (wcToggleWrap) {
      wcToggleWrap.style.display = bs.wc < 0 ? 'block' : 'none';
    }
    if (wcIntentionalEl) {
      wcIntentionalEl.value = h.wcIntentional ? 'yes' : 'no';
    }
    
    // Handle negative WC differently based on intentionality
    if (bs.wc < 0) {
      if (h.wcIntentional) {
        setText('wcNarrative', 'Negative working capital of ' + Finance.fmtMoney(bs.wc) + ' indicates strategic use of supplier credit.');
        setText('wcInterpretation', 'Business is efficiently using supplier financing to fund operations - a sign of strong cash cycle management.');
      } else {
        setText('wcNarrative', 'Negative working capital of ' + Finance.fmtMoney(bs.wc) + ' may require attention.');
        setText('wcInterpretation', 'Payables exceed receivables and inventory. Review if this is intentional supplier credit strategy or indicates cash flow pressure.');
      }
    } else {
      setText('wcNarrative', 
        bs.wcSalesRatio > thr.wcSalesHigh ? 'A significant portion of cash is locked in receivables and inventory.' :
        bs.wcSalesRatio > thr.wcSalesMed ? 'Moderate working capital tied up in operations.' :
        'Working capital is well managed relative to sales.'
      );
      setText('wcInterpretation',
        bs.wcSalesRatio > thr.wcSalesHigh ? 'Working capital requirements are high, may strain liquidity.' :
        bs.wcSalesRatio > thr.wcSalesMed ? 'Monitor receivables and inventory levels.' :
        'Cash conversion cycle appears efficient.'
      );
    }
    setTagProminent('wcTag', wcRisk);
    
    // === RECEIVABLES DISCIPLINE ===
    const arRisk = Finance.assessRisk(h.arAgeing, thr, 'arAgeing');
    addRisk(arRisk.level === 'neutral' ? 'medium' : arRisk.level);
    
    const arText = $('arDisciplineText');
    const arChart = $('arChartWrap');
    
    if (!h.arAgeing) {
      setText('arNarrative', 'Receivables ageing is not maintained, limiting visibility on overdue collections.');
      setText('arInterpretation', 'This significantly increases collection risk. Implement ageing tracking.');
      if (arChart) arChart.style.display = 'none';
      if (arText) arText.style.width = '100%';
    } else {
      const total = h.arAgeing.d0_30 + h.arAgeing.d31_60 + h.arAgeing.d61_90 + h.arAgeing.d90p;
      const over90Pct = total > 0 ? (h.arAgeing.d90p / total) * 100 : 0;
      const over60Pct = total > 0 ? (h.arAgeing.d61_90 / total) * 100 : 0;
      setText('arNarrative', Finance.fmtNum(over90Pct, 1) + '% of receivables are overdue beyond 90 days.');
      setText('arInterpretation', 
        over90Pct > 20 ? 'Critical: High collection risk. Immediate follow-up required on aged receivables.' :
        over90Pct > 10 || over60Pct > 25 ? 'Elevated ageing requires attention. Review credit terms and collection process.' :
        'Collection discipline is healthy with minimal aged receivables.'
      );
      if (arChart) arChart.style.display = 'block';
      if (arText) arText.style.width = 'auto';
    }
    setTagProminent('arTag', arRisk);
    
    // === PAYABLES DISCIPLINE ===
    const apRisk = Finance.assessRisk(h.apAgeing, thr, 'apAgeing', { apStrategic: h.apStrategic });
    addRisk(apRisk.level === 'neutral' ? 'medium' : apRisk.level);
    
    const apText = $('apDisciplineText');
    const apChart = $('apChartWrap');
    
    // Show/hide AP toggle based on whether ageing shows significant 90+ days
    const apToggleWrap = $('apToggleWrap');
    const apStrategicEl = $('apStrategic');
    let showApToggle = false;
    if (h.apAgeing) {
      const total = h.apAgeing.d0_30 + h.apAgeing.d31_60 + h.apAgeing.d61_90 + h.apAgeing.d90p;
      const over90Pct = total > 0 ? (h.apAgeing.d90p / total) * 100 : 0;
      showApToggle = over90Pct > 15;
    }
    if (apToggleWrap) {
      apToggleWrap.style.display = showApToggle ? 'block' : 'none';
    }
    if (apStrategicEl) {
      apStrategicEl.value = h.apStrategic ? 'yes' : 'no';
    }
    
    if (!h.apAgeing) {
      setText('apNarrative', 'Payables ageing is not maintained.');
      setText('apInterpretation', 'Without tracking, supplier relationship risks cannot be assessed.');
      if (apChart) apChart.style.display = 'none';
      if (apText) apText.style.width = '100%';
    } else {
      const total = h.apAgeing.d0_30 + h.apAgeing.d31_60 + h.apAgeing.d61_90 + h.apAgeing.d90p;
      const over90Pct = total > 0 ? (h.apAgeing.d90p / total) * 100 : 0;
      const over60Pct = total > 0 ? ((h.apAgeing.d61_90 + h.apAgeing.d90p) / total) * 100 : 0;
      setText('apNarrative', Finance.fmtNum(over90Pct, 1) + '% of payables are beyond 90 days.');
      
      if (h.apStrategic) {
        setText('apInterpretation', 
          over90Pct > 30 ? 'Extended payment terms negotiated with suppliers. Monitor relationships.' :
          over90Pct > 15 ? 'Strategic use of supplier credit. Ensure terms are formally agreed.' :
          'Payment discipline is current with agreed terms.'
        );
      } else {
        setText('apInterpretation', 
          over90Pct > 30 ? 'Elevated overdue payables may impact supplier relationships. Consider if extended terms can be negotiated.' :
          over90Pct > 15 ? 'Some payables beyond standard terms. Review payment priorities.' :
          'Payment discipline appears healthy.'
        );
      }
      if (apChart) apChart.style.display = 'block';
      if (apText) apText.style.width = 'auto';
    }
    setTagProminent('apTag', apRisk);
    
    // === LEVERAGE (DEBT-EQUITY) ===
    const deRisk = Finance.assessRisk(h.deRatio, thr, 'deRatio', { isDebtFree: h.isDebtFree });
    addRisk(deRisk.level);
    
    setText('deRatio', h.deRatio != null ? Finance.fmtNum(h.deRatio) + '×' : (h.isDebtFree ? '0×' : '—'));
    
    // FIX: Properly display Debt and Equity values
    setText('debtDisplay', Finance.fmtMoney(bs.totalDebt));
    setText('equityDisplay', Finance.fmtMoney(bs.eq));
    
    if (h.isDebtFree) {
      setText('leverageNarrative', 'The business is free from debt obligations.');
      setText('leverageInterpretation', 'Zero debt provides maximum financial flexibility and eliminates default risk. This is a position of strength.');
    } else {
      setText('leverageNarrative',
        h.deRatio == null ? 'Unable to calculate leverage.' :
        h.deRatio < thr.deHigh ? 'Strong equity base relative to debt.' :
        h.deRatio <= thr.deLow ? 'Moderate financial leverage.' :
        'Highly leveraged with significant debt.'
      );
      setText('leverageInterpretation',
        h.deRatio == null ? '' :
        h.deRatio < thr.deHigh ? 'Low financial risk with good flexibility.' :
        h.deRatio <= thr.deLow ? 'Debt levels manageable but reduce flexibility.' :
        'High financial risk. Debt reduction should be prioritized.'
      );
    }
    setTagProminent('leverageTag', deRisk);
    
    // === INTEREST COVERAGE ===
    const icrRisk = Finance.assessRisk(h.icr, thr, 'icr', { isInterestFree: h.isInterestFree });
    addRisk(icrRisk.level);
    
    setText('icrValue', h.icr != null ? Finance.fmtNum(h.icr) + '×' : (h.isInterestFree ? 'N/A' : '—'));
    
    // FIX: Properly display Operating Profit and Interest values
    setText('opProfitDisplay', Finance.fmtMoney(m.opProfit));
    setText('intDisplay', Finance.fmtMoney(m.INTm));
    
    if (h.isInterestFree) {
      setText('icrNarrative', 'The business has no interest obligations.');
      setText('icrInterpretation', 'Zero interest expense means all operating profit is retained. This is a strong financial position.');
    } else {
      setText('icrNarrative',
        h.icr == null ? 'Unable to calculate interest coverage.' :
        h.icr < thr.icrHigh ? 'Operating profits barely cover interest obligations.' :
        h.icr < thr.icrLow ? 'Operating profits cover interest with limited buffer.' :
        'Operating profits comfortably cover interest obligations.'
      );
      setText('icrInterpretation',
        h.icr == null ? '' :
        h.icr < thr.icrHigh ? 'High refinancing and default risk. Urgent attention needed.' :
        h.icr < thr.icrLow ? 'Moderate debt servicing comfort. Monitor closely.' :
        'Good debt servicing capacity. Low default risk.'
      );
    }
    setTagProminent('icrTag', icrRisk);
    
    // === CUSTOMER CONCENTRATION ===
    const custRisk = Finance.assessRisk(h.topCust, thr, 'concentration');
    addRisk(custRisk.level);
    
    setText('custConcNarrative', h.topCust != null 
      ? 'Revenue is ' + (h.topCust > thr.concHigh ? 'heavily' : 'moderately') + ' concentrated (' + Finance.fmtNum(h.topCust, 1) + '% from top customers).'
      : 'Customer concentration data not provided.'
    );
    setText('custConcInterpretation', h.topCust != null
      ? (h.topCust > thr.concHigh ? 'Loss of major customer could materially impact operations.' : 'Customer base shows reasonable diversification.')
      : 'Unable to assess customer dependency risk.'
    );
    setTagProminent('custConcTag', custRisk);
    
    // === SUPPLIER CONCENTRATION ===
    const suppRisk = Finance.assessRisk(h.topSupp, thr, 'concentration');
    addRisk(suppRisk.level);
    
    setText('suppConcNarrative', h.topSupp != null
      ? 'Purchases are ' + (h.topSupp > thr.concHigh ? 'heavily' : 'moderately') + ' concentrated (' + Finance.fmtNum(h.topSupp, 1) + '% from top suppliers).'
      : 'Supplier concentration data not provided.'
    );
    setText('suppConcInterpretation', h.topSupp != null
      ? (h.topSupp > thr.concHigh ? 'Supplier disruption could significantly impact operations.' : 'Supplier base shows reasonable diversification.')
      : 'Unable to assess supplier dependency risk.'
    );
    setTagProminent('suppConcTag', suppRisk);
    
    // === NETWORTH ===
    const networthRisk = Finance.assessRisk(bs.realNetworth, thr, 'networth', { equity: bs.eq });
    
    if (bs.realNetworth != null) {
      const ratio = bs.eq > 0 ? ((bs.realNetworth - bs.eq) / bs.eq) * 100 : null;
      
      // Determine narrative based on networth vs equity comparison
      let narrative, interpretation;
      
      if (bs.realNetworth <= 0) {
        narrative = 'Real networth is negative at ' + Finance.fmtMoney(bs.realNetworth) + '.';
        interpretation = 'Liabilities currently exceed realisable assets. Focus on building asset base and reducing liabilities.';
      } else if (bs.eq <= 0) {
        narrative = 'Real networth of ' + Finance.fmtMoney(bs.realNetworth) + '.';
        interpretation = 'Unable to compare with equity (equity is zero or negative).';
      } else if (bs.realNetworth < bs.eq * 0.975) {
        const erosion = Finance.fmtPct(Math.abs(ratio) / 100);
        narrative = 'Real networth (' + Finance.fmtMoney(bs.realNetworth) + ') is below invested equity (' + Finance.fmtMoney(bs.eq) + ').';
        interpretation = 'A gap of ' + erosion + ' from equity suggests some value erosion. This may recover with improved profitability.';
      } else if (bs.realNetworth <= bs.eq * 1.025) {
        narrative = 'Real networth (' + Finance.fmtMoney(bs.realNetworth) + ') is at par with invested equity.';
        interpretation = 'Business has preserved capital. Opportunity exists to build additional value through profitable operations.';
      } else if (ratio < 25) {
        narrative = 'Real networth (' + Finance.fmtMoney(bs.realNetworth) + ') exceeds equity by ' + Finance.fmtPct(ratio / 100) + '.';
        interpretation = 'Modest value creation. Business has generated returns above invested capital.';
      } else if (ratio < 50) {
        narrative = 'Real networth (' + Finance.fmtMoney(bs.realNetworth) + ') exceeds equity by ' + Finance.fmtPct(ratio / 100) + '.';
        interpretation = 'Healthy value creation. Business has built tangible value beyond original investment.';
      } else {
        narrative = 'Real networth (' + Finance.fmtMoney(bs.realNetworth) + ') exceeds equity by ' + Finance.fmtPct(ratio / 100) + '.';
        interpretation = 'Strong value creation. Business has significantly multiplied the original investment.';
      }
      
      setText('networthNarrative', narrative);
      setText('networthInterpretation', interpretation);
      setText('networthValue', Finance.fmtMoney(bs.realNetworth));
      setHtml('networthDetails', 
        '<span>Cash: <strong>' + Finance.fmtMoney(bs.cash) + '</strong></span>' +
        '<span>Inv: <strong>' + Finance.fmtMoney(bs.inv) + '</strong></span>' +
        '<span>AR: <strong>' + Finance.fmtMoney(bs.ar) + '</strong></span>' +
        (bs.otherCA ? '<span>Other CA: <strong>' + Finance.fmtMoney(bs.otherCA) + '</strong></span>' : '') +
        (bs.loansAdv ? '<span>Loans: <strong>' + Finance.fmtMoney(bs.loansAdv) + '</strong></span>' : '') +
        '<span>FA: <strong>' + Finance.fmtMoney(bs.realisableFA) + '</strong></span>' +
        '<span>Liab: <strong>' + Finance.fmtMoney(bs.totalLiabilities) + '</strong></span>' +
        '<span>Equity: <strong>' + Finance.fmtMoney(bs.eq) + '</strong></span>'
      );
    } else {
      setText('networthNarrative', 'Realisable value of fixed assets not provided.');
      setText('networthInterpretation', 'Enter value in Health Inputs to calculate real networth.');
      setText('networthValue', '—');
      setHtml('networthDetails', '');
    }
    setTagProminent('networthTag', networthRisk);
    
    // === OVERALL HEALTH BADGE ===
    const badge = $('healthBadge');
    if (badge) {
      if (riskCount.bad >= 3) {
        badge.className = 'health-badge-prominent health-bad';
        badge.textContent = '🔴 HIGH RISK';
      } else if (riskCount.bad >= 1 || riskCount.medium >= 3) {
        badge.className = 'health-badge-prominent health-medium';
        badge.textContent = '🟠 WATCH';
      } else {
        badge.className = 'health-badge-prominent health-good';
        badge.textContent = '🟢 HEALTHY';
      }
    }
    
    // === SUMMARY LIST ===
    const summaryList = $('healthSummaryList');
    if (summaryList) {
      const points = [];
      if (cashRisk.level === 'bad') points.push('Liquidity risk is elevated due to limited cash runway');
      if (wcRisk.level === 'bad') points.push('High working capital requirements strain cash flow');
      if (!arMaintained) points.push('Weak receivables discipline increases collection uncertainty');
      if (!apMaintained) points.push('Payables discipline not tracked');
      if (deRisk.level === 'bad') points.push('High leverage increases financial risk');
      if (icrRisk.level === 'bad') points.push('Debt servicing is a concern');
      if (custRisk.level === 'bad') points.push('High customer concentration is a structural risk');
      if (suppRisk.level === 'bad') points.push('High supplier concentration creates dependency');
      if (bs.realNetworth != null && bs.realNetworth <= 0) points.push('Negative real networth is a critical concern');
      
      if (points.length === 0) points.push('Overall financial health appears stable');
      
      summaryList.innerHTML = points.map(p => '<li>' + escapeHtml(p) + '</li>').join('');
    }
    
    return riskCount;
  };
  
  const renderExecutiveSummary = (summary, clientInputs) => {
    const container = $('executiveSummaryContent');
    if (!container || !summary) return;
    
    // Check for saved custom content
    const customPriorityActions = clientInputs?.customPriorityActions;
    const customNextSteps = clientInputs?.customNextSteps;
    
    const buildInsightCards = (insights, level) => {
      if (!insights || insights.length === 0) return '<p class="no-insights">None identified</p>';
      return insights.map(i => `
        <div class="summary-insight-card ${level}">
          <div class="summary-insight-header">
            <span class="summary-insight-icon">${escapeHtml(i.icon)}</span>
            <span class="summary-insight-title">${escapeHtml(i.title)}</span>
            <span class="summary-insight-metric">${escapeHtml(i.metric)}</span>
          </div>
          <div class="summary-insight-body">${escapeHtml(i.body)}</div>
        </div>
      `).join('');
    };
    
    // Build default priority actions HTML
    const defaultPriorityActionsHTML = summary.priorityActions.length > 0 
      ? summary.priorityActions.map(a => `<div class="exec-action ${escapeHtml(a.urgency)}"><span class="exec-action-dot"></span><span class="exec-action-text">${escapeHtml(a.text)}</span></div>`).join('')
      : '<div class="exec-action urgent"><span class="exec-action-dot"></span><span class="exec-action-text">Add your priority actions here...</span></div>';
    
    // Build default next steps HTML
    const defaultNextStepsHTML = summary.nextSteps.length > 0 
      ? summary.nextSteps.map((s, i) => `<div class="exec-next-step-item">${i + 1}. ${escapeHtml(s)}</div>`).join('') 
      : '<div class="exec-next-step-item">1. Add your recommended next steps here...</div>';
    
    // Generate opportunities from data
    const opportunities = summary.opportunities || [];
    const score = summary.bizlensScore;
    
    const swotItem = (item) => '<li>' + escapeHtml(item.title) + (item.metric ? ' (' + escapeHtml(item.metric) + ')' : '') + '</li>';
    const oppItem = (item) => '<li>' + escapeHtml(item.text) + '</li>';
    
    container.innerHTML = `
      <div class="exec-header">
        <div>
          <div class="exec-title">${escapeHtml(summary.clientName)} — Executive Summary</div>
          <div class="exec-date">Generated: ${escapeHtml(summary.date)} | Period: ${escapeHtml(summary.period)}</div>
        </div>
        <div class="exec-badge ${escapeHtml(summary.overallHealth)}">${escapeHtml(summary.healthLabel)}</div>
      </div>
      
      <div class="exec-metrics">
        ${summary.keyMetrics.map(m => `
          <div class="exec-metric">
            <div class="exec-metric-label">${escapeHtml(m.label)}</div>
            <div class="exec-metric-value ${m.status || ''}">${escapeHtml(m.value)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="swot-matrix">
        <div class="swot-quadrant swot-threats">
          <div class="swot-title">🔴 Threats</div>
          ${summary.categorizedInsights.redFlags.length > 0 
            ? '<ul class="swot-list">' + summary.categorizedInsights.redFlags.map(swotItem).join('') + '</ul>'
            : '<div class="swot-empty">No critical threats identified</div>'}
        </div>
        <div class="swot-quadrant swot-strengths">
          <div class="swot-title">🟢 Strengths</div>
          ${summary.categorizedInsights.strengths.length > 0
            ? '<ul class="swot-list">' + summary.categorizedInsights.strengths.map(swotItem).join('') + '</ul>'
            : '<div class="swot-empty">No strengths identified</div>'}
        </div>
        <div class="swot-quadrant swot-watch">
          <div class="swot-title">🟠 Watch Areas</div>
          ${summary.categorizedInsights.watchAreas.length > 0
            ? '<ul class="swot-list">' + summary.categorizedInsights.watchAreas.map(swotItem).join('') + '</ul>'
            : '<div class="swot-empty">No watch areas</div>'}
        </div>
        <div class="swot-quadrant swot-opportunities">
          <div class="swot-title">🔵 Opportunities</div>
          ${opportunities.length > 0
            ? '<ul class="swot-list">' + opportunities.map(oppItem).join('') + '</ul>'
            : '<div class="swot-empty">No opportunities identified</div>'}
        </div>
      </div>
      
      <div class="exec-two-col mt14">
        <div class="exec-actions">
          <div class="exec-actions-header">
            <div class="exec-actions-title">Priority Actions</div>
            <button class="add-action-btn" id="addPriorityAction" title="Add action">+ Add</button>
          </div>
          <div class="exec-actions-list" id="priorityActionsList">
            ${buildPriorityActionsHTML(customPriorityActions, summary.priorityActions)}
          </div>
        </div>
        <div class="exec-next-steps">
          <div class="exec-next-steps-header">
            <div class="exec-next-steps-title">Recommended Next Steps</div>
            <button class="add-action-btn" id="addNextStep" title="Add step">+ Add</button>
          </div>
          <div class="exec-next-steps-list" id="nextStepsList">
            ${buildNextStepsHTML(customNextSteps, summary.nextSteps)}
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners for the editable actions
    setTimeout(() => {
      setupEditableActionsListeners();
    }, 0);
  };
  
  const buildPriorityActionsHTML = (customPriorityActions, defaultActions) => {
    let actions = [];
    if (customPriorityActions) {
      try {
        actions = JSON.parse(customPriorityActions);
      } catch(e) {
        actions = defaultActions.map(a => ({ text: a.text, urgency: a.urgency }));
      }
    } else {
      actions = defaultActions.map(a => ({ text: a.text, urgency: a.urgency }));
    }
    if (actions.length === 0) {
      actions = [{ text: 'Click to add your priority action...', urgency: 'urgent' }];
    }
    return actions.map((a, i) => {
      const urgentSelected = a.urgency === 'urgent' ? 'selected' : '';
      const importantSelected = a.urgency === 'important' ? 'selected' : '';
      return '<div class="exec-action-item" data-index="' + i + '">' +
        '<select class="action-priority-select" data-index="' + i + '">' +
        '<option value="urgent" ' + urgentSelected + '>🔴</option>' +
        '<option value="important" ' + importantSelected + '>🟠</option>' +
        '</select>' +
        '<span class="exec-action-dot ' + a.urgency + '"></span>' +
        '<textarea class="action-text-input" data-index="' + i + '" placeholder="Enter action..." rows="1">' + escapeHtml(a.text) + '</textarea>' +
        '<button class="delete-action-btn" data-index="' + i + '" title="Delete">×</button>' +
        '</div>';
    }).join('');
  };
  
  const buildNextStepsHTML = (customNextSteps, defaultSteps) => {
    let steps = [];
    if (customNextSteps) {
      try {
        steps = JSON.parse(customNextSteps);
      } catch(e) {
        steps = defaultSteps;
      }
    } else {
      steps = defaultSteps;
    }
    if (steps.length === 0) {
      steps = ['Click to add your next step...'];
    }
    return steps.map((s, i) => {
      return '<div class="exec-step-item" data-index="' + i + '">' +
        '<span class="step-number">' + (i + 1) + '.</span>' +
        '<textarea class="step-text-input" data-index="' + i + '" placeholder="Enter step..." rows="1">' + escapeHtml(s) + '</textarea>' +
        '<button class="delete-action-btn" data-index="' + i + '" title="Delete">×</button>' +
        '</div>';
    }).join('');
  };
  
  const setupEditableActionsListeners = () => {
    // Priority Actions
    const actionsList = document.getElementById('priorityActionsList');
    const addActionBtn = document.getElementById('addPriorityAction');
    
    if (addActionBtn) {
      addActionBtn.onclick = () => {
        const newItem = document.createElement('div');
        newItem.className = 'exec-action-item';
        newItem.innerHTML = 
          '<select class="action-priority-select">' +
          '<option value="urgent" selected>🔴</option>' +
          '<option value="important">🟠</option>' +
          '</select>' +
          '<span class="exec-action-dot urgent"></span>' +
          '<textarea class="action-text-input" placeholder="Enter action..." rows="1"></textarea>' +
          '<button class="delete-action-btn" title="Delete">×</button>';
        actionsList.appendChild(newItem);
        newItem.querySelector('textarea').focus();
        attachActionItemListeners(newItem);
      };
    }
    
    // Attach listeners to existing items
    if (actionsList) {
      actionsList.querySelectorAll('.exec-action-item').forEach(item => {
        attachActionItemListeners(item);
      });
    }
    
    // Next Steps
    const stepsList = document.getElementById('nextStepsList');
    const addStepBtn = document.getElementById('addNextStep');
    
    if (addStepBtn) {
      addStepBtn.onclick = () => {
        const count = stepsList.querySelectorAll('.exec-step-item').length;
        const newItem = document.createElement('div');
        newItem.className = 'exec-step-item';
        newItem.innerHTML = 
          '<span class="step-number">' + (count + 1) + '.</span>' +
          '<textarea class="step-text-input" placeholder="Enter step..." rows="1"></textarea>' +
          '<button class="delete-action-btn" title="Delete">×</button>';
        stepsList.appendChild(newItem);
        newItem.querySelector('textarea').focus();
        attachStepItemListeners(newItem);
      };
    }
    
    // Attach listeners to existing step items
    if (stepsList) {
      stepsList.querySelectorAll('.exec-step-item').forEach(item => {
        attachStepItemListeners(item);
      });
    }
  };
  
  const attachActionItemListeners = (item) => {
    const select = item.querySelector('.action-priority-select');
    const textarea = item.querySelector('.action-text-input');
    const deleteBtn = item.querySelector('.delete-action-btn');
    const dot = item.querySelector('.exec-action-dot');
    
    // Auto-resize textarea
    const autoResize = (el) => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };
    
    if (select) {
      select.onchange = () => {
        dot.className = 'exec-action-dot ' + select.value;
        savePriorityActions();
      };
    }
    
    if (textarea) {
      autoResize(textarea);
      textarea.oninput = () => autoResize(textarea);
      textarea.onblur = () => savePriorityActions();
      textarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          textarea.blur();
        }
      };
    }
    
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        item.remove();
        savePriorityActions();
      };
    }
  };
  
  const attachStepItemListeners = (item) => {
    const textarea = item.querySelector('.step-text-input');
    const deleteBtn = item.querySelector('.delete-action-btn');
    
    const autoResize = (el) => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };
    
    if (textarea) {
      autoResize(textarea);
      textarea.oninput = () => autoResize(textarea);
      textarea.onblur = () => saveNextSteps();
      textarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          textarea.blur();
        }
      };
    }
    
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        item.remove();
        const stepsList = document.getElementById('nextStepsList');
        stepsList.querySelectorAll('.exec-step-item').forEach((step, i) => {
          step.querySelector('.step-number').textContent = (i + 1) + '.';
        });
        saveNextSteps();
      };
    }
  };
  
  const savePriorityActions = () => {
    const actionsList = document.getElementById('priorityActionsList');
    if (!actionsList) return;
    
    const actions = [];
    actionsList.querySelectorAll('.exec-action-item').forEach(item => {
      const select = item.querySelector('.action-priority-select');
      const input = item.querySelector('.action-text-input');
      if (input && input.value.trim()) {
        actions.push({
          text: input.value.trim(),
          urgency: select ? select.value : 'urgent'
        });
      }
    });
    
    window.dispatchEvent(new CustomEvent('savePriorityActions', { detail: JSON.stringify(actions) }));
  };
  
  const saveNextSteps = () => {
    const stepsList = document.getElementById('nextStepsList');
    if (!stepsList) return;
    
    const steps = [];
    stepsList.querySelectorAll('.exec-step-item').forEach(item => {
      const input = item.querySelector('.step-text-input');
      if (input && input.value.trim()) {
        steps.push(input.value.trim());
      }
    });
    
    window.dispatchEvent(new CustomEvent('saveNextSteps', { detail: JSON.stringify(steps) }));
  };

  return {
    $,
    toast,
    showLoading,
    setText,
    setHtml,
    setTagProminent,
    setTrend,
    renderOperatingDashboard,
    renderSimulatorResults,
    renderOptimumScenarios,
    renderHealthSection,
    renderExecutiveSummary
  };
})();

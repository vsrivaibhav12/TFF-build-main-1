const PDF = (() => {
  
  const generatePDF = async (report, clientName, thresholds, savedScenarios, commitments, periodString) => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('PDF library not available');
    }
    
    if (!report) throw new Error('No report data');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pw - 2 * margin;
    let y = margin;
    let pageNum = 0;
    let footerAdded = false;
    
    // Color palette (RGB arrays)
    const colors = {
      primary: [37, 99, 235],
      primaryDark: [30, 64, 175],
      text: [15, 23, 42],
      textLight: [100, 116, 139],
      success: [20, 184, 166],
      successBg: [204, 251, 241],
      warning: [245, 158, 11],
      warningBg: [254, 243, 199],
      danger: [239, 68, 68],
      dangerBg: [254, 226, 226],
      border: [226, 232, 240],
      bg: [248, 250, 252],
      white: [255, 255, 255],
      purple: [139, 92, 246]
    };
    
    // Clean text - remove any special characters
    const cleanText = (str) => {
      if (str == null) return '';
      return String(str)
        .replace(/[^\x20-\x7E\n]/g, '') // Only keep printable ASCII
        .replace(/Rs\.\s*/g, 'Rs ')
        .trim();
    };
    
    // Format money for PDF (using Rs instead of symbol)
    const fmtMoney = (n) => {
      if (n == null || isNaN(n)) return 'Rs --';
      const abs = Math.round(Math.abs(n));
      const formatted = abs.toLocaleString('en-IN');
      return (n >= 0 ? 'Rs ' : '-Rs ') + formatted;
    };
    
    const fmtNum = (n, d = 0) => {
      if (n == null || isNaN(n)) return '--';
      if (d > 0) {
        return Number(n).toFixed(d);
      }
      return Math.round(n).toLocaleString('en-IN');
    };
    
    const fmtPct = (n) => {
      if (n == null || isNaN(n)) return '--';
      return (n * 100).toFixed(1) + '%';
    };
    
    // Helper functions
    const setColor = (type, c) => {
      if (type === 'text') pdf.setTextColor(c[0], c[1], c[2]);
      else if (type === 'fill') pdf.setFillColor(c[0], c[1], c[2]);
      else if (type === 'draw') pdf.setDrawColor(c[0], c[1], c[2]);
    };
    
    const drawRect = (x, yPos, w, h, fill, stroke, radius = 0) => {
      if (fill) {
        setColor('fill', fill);
        if (radius > 0) {
          pdf.roundedRect(x, yPos, w, h, radius, radius, 'F');
        } else {
          pdf.rect(x, yPos, w, h, 'F');
        }
      }
      if (stroke) {
        setColor('draw', stroke);
        pdf.setLineWidth(0.3);
        if (radius > 0) {
          pdf.roundedRect(x, yPos, w, h, radius, radius, 'S');
        } else {
          pdf.rect(x, yPos, w, h, 'S');
        }
      }
    };
    
    const wrapText = (text, maxWidth) => {
      return pdf.splitTextToSize(cleanText(text), maxWidth);
    };
    
    // Page header - consistent across all pages
    const addPageHeader = (title) => {
      // Blue top bar
      setColor('fill', colors.primary);
      pdf.rect(0, 0, pw, 3, 'F');
      
      // Header text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setColor('text', colors.primary);
      pdf.text('BizLens', margin, 12);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setColor('text', colors.textLight);
      pdf.text('|  ' + cleanText(title), margin + 22, 12);
      
      // Right side - client name
      pdf.setFontSize(9);
      setColor('text', colors.text);
      pdf.text(cleanText(clientName), pw - margin, 12, { align: 'right' });
      
      // Line under header
      setColor('draw', colors.border);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 18, pw - margin, 18);
      
      y = 26;
    };
    
    // Page footer - consistent across all pages
    const addPageFooter = () => {
      if (footerAdded) return;
      footerAdded = true;
      pageNum++;
      
      // Line above footer
      setColor('draw', colors.border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, ph - 14, pw - margin, ph - 14);
      
      // Footer text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor('text', colors.textLight);
      pdf.text('Confidential | BizLens Financial Intelligence Report | ' + Finance.todayStr(), margin, ph - 8);
      pdf.text('Page ' + pageNum, pw - margin, ph - 8, { align: 'right' });
    };
    
    const newPage = (title) => {
      addPageFooter();
      pdf.addPage();
      footerAdded = false;
      addPageHeader(title);
    };
    
    const ensureSpace = (needed) => {
      if (y + needed > ph - 22) {
        newPage('Report Continued');
        return true;
      }
      return false;
    };
    
    // Section title with colored bar
    const addSectionTitle = (title, color = colors.primary) => {
      ensureSpace(20);
      setColor('fill', color);
      pdf.roundedRect(margin, y, 3, 10, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      setColor('text', colors.text);
      pdf.text(cleanText(title), margin + 8, y + 7);
      y += 16;
    };
    
    // KPI Card
    const addKPICard = (x, yPos, w, h, label, value, sublabel, status) => {
      const bgColor = status === 'good' ? colors.successBg : status === 'bad' ? colors.dangerBg : colors.white;
      const valueColor = status === 'good' ? colors.success : status === 'bad' ? colors.danger : colors.text;
      
      drawRect(x, yPos, w, h, bgColor, colors.border, 2);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setColor('text', colors.textLight);
      pdf.text(cleanText(label).toUpperCase(), x + 4, yPos + 8);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setColor('text', valueColor);
      const valueText = cleanText(String(value));
      if (valueText.length > 15) {
        pdf.setFontSize(9);
      }
      pdf.text(valueText, x + 4, yPos + 18);
      
      if (sublabel) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        setColor('text', colors.textLight);
        pdf.text(cleanText(sublabel), x + 4, yPos + 25);
      }
    };
    
    // Table row
    const addTableRow = (cols, isHeader = false, rowColor = null) => {
      const rowHeight = 10;
      
      if (rowColor) {
        drawRect(margin, y, contentWidth, rowHeight, rowColor);
      }
      
      pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(9);
      
      let xPos = margin + 4;
      const colWidths = [50, 40, 50, 30];
      
      cols.forEach((col, i) => {
        if (col.color) {
          setColor('text', col.color);
        } else {
          setColor('text', colors.text);
        }
        pdf.text(cleanText(col.text || col), xPos, y + 7);
        xPos += colWidths[i] || 40;
      });
      
      y += rowHeight;
    };
    
    // Extract report data
    const { monthly: m, totals: t, bs, health: h } = report;
    const thr = thresholds || {};
    const insights = Insights.generateInsights(report, null, thr);
    
    // ========== COVER PAGE ==========
    // Clean, professional cover
    setColor('fill', colors.primary);
    pdf.rect(0, 0, pw, ph, 'F');
    
    // White content area
    drawRect(margin, 40, contentWidth, 180, colors.white, null, 8);
    
    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    setColor('text', colors.primary);
    pdf.text('Financial Intelligence', pw / 2, 80, { align: 'center' });
    pdf.text('Report', pw / 2, 95, { align: 'center' });
    
    // Client name
    pdf.setFontSize(20);
    setColor('text', colors.text);
    const clientLines = wrapText(clientName, contentWidth - 40);
    let clientY = 125;
    clientLines.forEach(line => {
      pdf.text(line, pw / 2, clientY, { align: 'center' });
      clientY += 10;
    });
    
    // Divider line
    setColor('draw', colors.border);
    pdf.setLineWidth(0.5);
    pdf.line(pw / 2 - 40, 150, pw / 2 + 40, 150);
    
    // Period info
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    setColor('text', colors.textLight);
    pdf.text('Period: ' + (periodString || t.M + ' months'), pw / 2, 165, { align: 'center' });
    pdf.text('Generated: ' + Finance.todayStr(), pw / 2, 178, { align: 'center' });
    
    // Powered by
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setColor('text', colors.textLight);
    pdf.text('Powered by BizLens', pw / 2, 210, { align: 'center' });

    // Firm credentials
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('The Fiscal Fulcrum LLP', pw / 2, ph - 55, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Chartered Accountants', pw / 2, ph - 46, { align: 'center' });
    pdf.setFontSize(8);
    pdf.text('CA Padmanabhan R  |  CA Mithuna D V  |  CA Sri Vaibhav V', pw / 2, ph - 38, { align: 'center' });

    // Footer on cover
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Confidential Document', pw / 2, ph - 15, { align: 'center' });
    
    // ========== PAGE 1: EXECUTIVE SUMMARY ==========
    pdf.addPage();
    footerAdded = false;
    pageNum = 0; // Reset page number (cover doesn't count)
    addPageHeader('Executive Summary');
    
    // Health status determination
    const badCount = [
      h.cashRunway != null && h.cashRunway < (thr.cashHigh || 3),
      h.deRatio != null && h.deRatio > (thr.deLow || 2),
      h.icr != null && h.icr < (thr.icrHigh || 1.5),
      m.opProfit <= 0,
      m.mosPct != null && m.mosPct < 0.08
    ].filter(Boolean).length;
    
    // Health Status
    const healthStatus = badCount >= 3 ? 'bad' : badCount >= 1 ? 'medium' : 'good';
    const healthLabel = healthStatus === 'good' ? 'HEALTHY' : healthStatus === 'medium' ? 'NEEDS ATTENTION' : 'AT RISK';
    const healthBg = healthStatus === 'good' ? colors.successBg : healthStatus === 'bad' ? colors.dangerBg : colors.warningBg;
    drawRect(margin, y, contentWidth, 16, healthBg, null, 4);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setColor('text', healthStatus === 'good' ? colors.success : healthStatus === 'bad' ? colors.danger : colors.warning);
    pdf.text('Overall Status: ' + healthLabel, margin + 8, y + 11);
    y += 24;
    
    // Key metrics grid
    addSectionTitle('Key Metrics');
    
    const kpiW = (contentWidth - 10) / 3;
    addKPICard(margin, y, kpiW, 28, 'Monthly Sales', fmtMoney(m.Rm), 'Revenue per month');
    addKPICard(margin + kpiW + 5, y, kpiW, 28, 'Operating Profit', fmtMoney(m.opProfit), fmtPct(m.opPct) + ' margin', m.opProfit > 0 ? 'good' : 'bad');
    addKPICard(margin + 2 * (kpiW + 5), y, kpiW, 28, 'Safety Buffer', fmtPct(m.mosPct), fmtMoney(m.mos) + ' above BE', m.mosPct >= 0.15 ? 'good' : m.mosPct < 0.05 ? 'bad' : null);
    y += 34;
    
    addKPICard(margin, y, kpiW, 28, 'Cash Runway', h.cashRunway != null ? fmtNum(h.cashRunway, 1) + ' months' : '--', 'Cash: ' + fmtMoney(bs.cash), h.cashRunway >= 6 ? 'good' : h.cashRunway < 3 ? 'bad' : null);
    addKPICard(margin + kpiW + 5, y, kpiW, 28, 'Debt-Equity', h.deRatio != null ? fmtNum(h.deRatio, 2) + 'x' : '--', 'Debt: ' + fmtMoney(bs.totalDebt), h.deRatio <= 1 ? 'good' : h.deRatio > 2 ? 'bad' : null);
    addKPICard(margin + 2 * (kpiW + 5), y, kpiW, 28, 'Break-Even', fmtMoney(m.beSales), 'Monthly minimum');
    y += 38;
    
    // Risk counts
    addSectionTitle('Risk Summary', colors.warning);

    const countW = (contentWidth - 10) / 3;

    drawRect(margin + countW + 5, y, countW, 28, colors.warningBg, null, 4);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    setColor('text', colors.warning);
    pdf.text(String(insights.watchAreas.length), margin + countW + 5 + countW / 2, y + 14, { align: 'center' });
    pdf.setFontSize(8);
    setColor('text', colors.textLight);
    pdf.text('WATCH AREAS', margin + countW + 5 + countW / 2, y + 23, { align: 'center' });

    drawRect(margin + 2 * (countW + 5), y, countW, 28, colors.successBg, null, 4);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    setColor('text', colors.success);
    pdf.text(String(insights.strengths.length), margin + 2 * (countW + 5) + countW / 2, y + 14, { align: 'center' });
    pdf.setFontSize(8);
    setColor('text', colors.textLight);
    pdf.text('STRENGTHS', margin + 2 * (countW + 5) + countW / 2, y + 23, { align: 'center' });
    y += 36;
    
    // Priority Actions
    if (insights.priorityActions.length > 0) {
      addSectionTitle('Priority Actions', colors.danger);
      
      const actionsToShow = insights.priorityActions.slice(0, 4);
      const boxHeight = actionsToShow.length * 12 + 10;
      
      ensureSpace(boxHeight + 5);
      drawRect(margin, y, contentWidth, boxHeight, colors.white, colors.border, 3);
      
      let actionY = y + 10;
      actionsToShow.forEach(action => {
        setColor('fill', action.urgency === 'urgent' ? colors.danger : colors.warning);
        pdf.circle(margin + 6, actionY - 1, 2, 'F');
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        setColor('text', colors.text);
        const lines = wrapText(action.text, contentWidth - 20);
        pdf.text(lines[0], margin + 12, actionY);
        actionY += 12;
      });
      
      y += boxHeight + 8;
    }
    
    addPageFooter();
    
    // ========== PAGE 2: OPERATING PERFORMANCE ==========
    newPage('Operating Performance');
    
    addSectionTitle('Income Statement');
    
    // Table
    ensureSpace(80);
    drawRect(margin, y, contentWidth, 75, colors.white, colors.border, 3);
    y += 6;
    
    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setColor('text', colors.textLight);
    pdf.text('METRIC', margin + 6, y + 6);
    pdf.text('MONTHLY', margin + 55, y + 6);
    pdf.text('TOTAL (' + t.M + ' mo)', margin + 100, y + 6);
    pdf.text('% SALES', margin + 150, y + 6);
    y += 12;
    
    setColor('draw', colors.border);
    pdf.line(margin + 4, y - 2, margin + contentWidth - 4, y - 2);
    
    const tableData = [
      { name: 'Sales Revenue', monthly: fmtMoney(m.Rm), total: fmtMoney(t.R), pct: '100%', color: colors.text },
      { name: 'Variable Costs', monthly: fmtMoney(m.VCm), total: fmtMoney(t.VC), pct: fmtPct(1 - m.cmPct), color: colors.purple },
      { name: 'Contribution Margin', monthly: fmtMoney(m.contribution), total: fmtMoney(m.contribution * t.M), pct: fmtPct(m.cmPct), color: colors.success, bold: true },
      { name: 'Fixed Costs', monthly: fmtMoney(m.FCm), total: fmtMoney(t.FC), pct: fmtPct(m.fcPct), color: colors.warning },
      { name: 'Operating Profit', monthly: fmtMoney(m.opProfit), total: fmtMoney(t.opTotal), pct: fmtPct(m.opPct), color: m.opProfit >= 0 ? colors.success : colors.danger, bold: true }
    ];
    
    tableData.forEach(row => {
      pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
      pdf.setFontSize(9);
      setColor('text', row.color);
      pdf.text(row.name, margin + 6, y + 5);
      pdf.text(row.monthly, margin + 55, y + 5);
      pdf.text(row.total, margin + 100, y + 5);
      pdf.text(row.pct, margin + 150, y + 5);
      y += 10;
    });
    
    y += 10;
    
    // Break-even section
    addSectionTitle('Break-Even Analysis', colors.warning);
    
    const beW = (contentWidth - 10) / 4;
    addKPICard(margin, y, beW, 26, 'CM Ratio', fmtPct(m.cmPct), 'Per rupee');
    addKPICard(margin + beW + 3, y, beW, 26, 'Break-Even', fmtMoney(m.beSales), 'Monthly');
    addKPICard(margin + 2 * (beW + 3), y, beW, 26, 'Safety Margin', fmtMoney(m.mos), 'Above BE');
    addKPICard(margin + 3 * (beW + 3), y, beW, 26, 'Safety %', fmtPct(m.mosPct), 'Of sales', m.mosPct >= 0.15 ? 'good' : m.mosPct < 0.05 ? 'bad' : null);
    y += 34;
    
    // Actual P&L
    addSectionTitle('Actual Profit & Loss', colors.success);
    
    ensureSpace(50);
    drawRect(margin, y, contentWidth, 44, colors.white, colors.border, 3);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setColor('text', colors.text);
    pdf.text('Operating Profit', margin + 6, y + 12);
    pdf.text(fmtMoney(t.opTotal), margin + 50, y + 12);
    
    pdf.text('+ Inventory Change', margin + 6, y + 22);
    pdf.text(fmtMoney(t.INV), margin + 50, y + 22);
    
    pdf.text('+ Other Income', margin + 6, y + 32);
    pdf.text(fmtMoney(t.OI), margin + 50, y + 32);
    
    pdf.text('- Non-cash Expenses', margin + 95, y + 12);
    pdf.text(fmtMoney(t.NC), margin + 145, y + 12);
    
    pdf.setFont('helvetica', 'bold');
    setColor('text', t.actualPL >= 0 ? colors.success : colors.danger);
    pdf.text('= Actual P&L', margin + 95, y + 30);
    pdf.setFontSize(12);
    pdf.text(fmtMoney(t.actualPL), margin + 145, y + 30);
    
    y += 52;
    
    addPageFooter();
    
    // ========== PAGE 3: BUSINESS HEALTH ==========
    newPage('Business Health');
    
    addSectionTitle('Health Indicators');
    
    const healthItems = [
      { label: 'Cash Runway', value: h.cashRunway != null ? fmtNum(h.cashRunway, 1) + ' months' : '--', detail: 'Cash / Monthly Fixed Costs', risk: Finance.assessRisk(h.cashRunway, thr, 'cashRunway') },
      { label: 'Working Capital', value: fmtMoney(bs.wc), detail: bs.wc < 0 ? (h.wcIntentional ? 'Strategic supplier credit' : 'Payables exceed AR+Inv') : 'AR + Inventory - Payables', risk: Finance.assessRisk(bs.wcSalesRatio, thr, 'wcSales', { wc: bs.wc, wcIntentional: h.wcIntentional }) },
      { label: 'Debt-Equity Ratio', value: h.isDebtFree ? '0x (Debt-Free)' : (h.deRatio != null ? fmtNum(h.deRatio, 2) + 'x' : '--'), detail: h.isDebtFree ? 'Business is free from debt obligations' : 'Total Debt / Equity', risk: Finance.assessRisk(h.deRatio, thr, 'deRatio', { isDebtFree: h.isDebtFree }) },
      { label: 'Interest Coverage', value: h.isInterestFree ? 'No Interest' : (h.icr != null ? fmtNum(h.icr, 2) + 'x' : '--'), detail: h.isInterestFree ? 'Business is free from interest obligations' : 'Operating Profit / Interest', risk: Finance.assessRisk(h.icr, thr, 'icr', { isInterestFree: h.isInterestFree }) }
    ];
    
    const healthW = (contentWidth - 6) / 2;
    let hRow = 0;
    
    healthItems.forEach((item, i) => {
      const col = i % 2;
      if (i > 0 && col === 0) {
        y += 36;
        hRow++;
      }
      
      const hx = margin + col * (healthW + 6);
      const riskBg = item.risk.level === 'good' ? colors.successBg : item.risk.level === 'bad' ? colors.dangerBg : item.risk.level === 'neutral' ? colors.bg : colors.warningBg;
      const riskColor = item.risk.level === 'good' ? colors.success : item.risk.level === 'bad' ? colors.danger : item.risk.level === 'neutral' ? colors.textLight : colors.warning;
      
      drawRect(hx, y, healthW, 32, colors.white, colors.border, 3);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setColor('text', colors.textLight);
      pdf.text(cleanText(item.label).toUpperCase(), hx + 5, y + 8);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      setColor('text', riskColor);
      pdf.text(cleanText(item.value), hx + 5, y + 20);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setColor('text', colors.textLight);
      pdf.text(cleanText(item.detail), hx + 5, y + 28);
      
      // Badge
      const badgeW = 22;
      drawRect(hx + healthW - badgeW - 5, y + 5, badgeW, 10, riskBg, null, 2);
      pdf.setFontSize(6);
      setColor('text', riskColor);
      pdf.text(cleanText(item.risk.label).toUpperCase(), hx + healthW - badgeW / 2 - 5, y + 12, { align: 'center' });
    });
    
    y += 44;
    
    // Networth
    if (bs.realNetworth != null) {
      addSectionTitle('Real Networth', colors.purple);
      
      ensureSpace(40);
      const nwRisk = Finance.assessRisk(bs.realNetworth, thr, 'networth', { equity: bs.eq });
      const nwColor = nwRisk.level === 'good' ? colors.success : nwRisk.level === 'bad' ? colors.danger : colors.warning;
      
      // Calculate ratio for display
      const ratio = bs.eq > 0 ? ((bs.realNetworth - bs.eq) / bs.eq) * 100 : null;
      let nwDetail = '';
      if (bs.realNetworth <= 0) {
        nwDetail = 'Capital eroded - liabilities exceed assets';
      } else if (bs.eq > 0 && bs.realNetworth < bs.eq * 0.975) {
        nwDetail = 'Below equity by ' + Math.abs(ratio).toFixed(1) + '% - scope for improvement';
      } else if (bs.eq > 0 && bs.realNetworth <= bs.eq * 1.025) {
        nwDetail = 'At par with invested equity - capital preserved';
      } else if (ratio != null) {
        nwDetail = 'Exceeds equity by ' + ratio.toFixed(1) + '% - value created';
      }
      
      drawRect(margin, y, contentWidth, 35, colors.white, colors.border, 3);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      setColor('text', nwColor);
      pdf.text(fmtMoney(bs.realNetworth), margin + 8, y + 14);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor('text', colors.textLight);
      pdf.text(cleanText(nwDetail), margin + 8, y + 23);
      pdf.text('Equity: ' + fmtMoney(bs.eq) + '  |  Total Assets: ' + fmtMoney(bs.totalCurrentAssets + bs.realisableFA) + '  |  Liabilities: ' + fmtMoney(bs.totalLiabilities), margin + 8, y + 31);
      
      y += 43;
    }
    
    // Concentration
    addSectionTitle('Concentration Risk', colors.warning);
    
    const concW = (contentWidth - 6) / 2;
    drawRect(margin, y, concW, 28, colors.white, colors.border, 3);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setColor('text', colors.text);
    pdf.text('Customer Concentration', margin + 5, y + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setColor('text', h.topCust != null && h.topCust > 50 ? colors.danger : colors.textLight);
    pdf.text(h.topCust != null ? fmtNum(h.topCust) + '% from top customers' : 'Not tracked', margin + 5, y + 22);
    
    drawRect(margin + concW + 6, y, concW, 28, colors.white, colors.border, 3);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setColor('text', colors.text);
    pdf.text('Supplier Concentration', margin + concW + 11, y + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setColor('text', h.topSupp != null && h.topSupp > 50 ? colors.danger : colors.textLight);
    pdf.text(h.topSupp != null ? fmtNum(h.topSupp) + '% from top suppliers' : 'Not tracked', margin + concW + 11, y + 22);
    
    y += 36;
    
    addPageFooter();
    
    // ========== PAGE 4: SWOT ANALYSIS ==========
    if (insights.redFlags.length > 0 || insights.watchAreas.length > 0 || insights.strengths.length > 0) {
      newPage('SWOT Analysis');
      
      const opportunities = Finance.generateOpportunities ? Finance.generateOpportunities(report) : [];
      const quadW = (contentWidth - 6) / 2;
      const drawQuadrant = (x, startY, title, items, color, bgColor, isOpp) => {
        const maxItems = Math.min(5, items.length);
        const qH = 12 + maxItems * 8 + 8;
        drawRect(x, startY, quadW, qH, bgColor, color, 3);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        setColor('text', color);
        pdf.text(cleanText(title), x + 6, startY + 10);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setColor('text', colors.text);
        items.slice(0, 5).forEach((item, i) => {
          const txt = isOpp ? cleanText(item.text) : cleanText(item.title + (item.metric ? ' (' + item.metric + ')' : ''));
          const line = wrapText('* ' + txt, quadW - 12)[0] || '';
          pdf.text(line, x + 6, startY + 20 + i * 8);
        });
        if (items.length === 0) {
          pdf.setFontSize(8);
          setColor('text', colors.textLight);
          pdf.text('None identified', x + 6, startY + 20);
        }
        return qH;
      };
      
      const h1 = drawQuadrant(margin, y, 'THREATS', insights.redFlags, colors.danger, colors.dangerBg, false);
      drawQuadrant(margin + quadW + 6, y, 'STRENGTHS', insights.strengths, colors.success, colors.successBg, false);
      y += Math.max(h1, 12 + Math.min(5, insights.strengths.length) * 8 + 8) + 6;
      const h2 = drawQuadrant(margin, y, 'WATCH AREAS', insights.watchAreas, colors.warning, colors.warningBg, false);
      drawQuadrant(margin + quadW + 6, y, 'OPPORTUNITIES', opportunities, colors.primary, [219, 234, 254], true);
      y += Math.max(h2, 12 + Math.min(5, opportunities.length) * 8 + 8) + 6;
      
      addPageFooter();
    }
    
    // ========== PAGE 5: INSIGHTS ==========
    {
      newPage('Business Insights');
      
      // Break-Even Days
      const bed = Finance.computeBreakEvenDays(report);
      if (bed) {
        addSectionTitle('Break-Even in Days', colors.primary);
        ensureSpace(50);
        
        // Bar
        const barW = contentWidth;
        const costW = Math.min(barW, (bed.beDays / 30) * barW);
        const profW = barW - costW;
        drawRect(margin, y, costW, 12, colors.warning, null, 3);
        drawRect(margin + costW, y, profW, 12, colors.success, null, 3);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        if (costW > 30) pdf.text(bed.beDays + 'd Costs', margin + costW / 2, y + 8, { align: 'center' });
        if (profW > 30) pdf.text(bed.profitDays + 'd Profit', margin + costW + profW / 2, y + 8, { align: 'center' });
        y += 18;
        
        setColor('text', colors.text);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        if (!bed.isLoss) {
          pdf.text(cleanText('You work until the ' + bed.beDays + 'th to cover costs. Profit starts on the ' + bed.freedomDay + 'th.'), margin, y);
        } else {
          pdf.text('Business does not break even within the month.', margin, y);
        }
        y += 12;
        
        // Metrics row
        const metricW = contentWidth / 4;
        [['Daily Sales', fmtMoney(bed.dailySales)], ['Daily Profit', fmtMoney(bed.dailyProfit)], ['Cost Days', bed.beDays + '/30'], ['Profit Days', bed.profitDays + ' days']].forEach(([label, val], i) => {
          const mx = margin + i * metricW;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          setColor('text', colors.textLight);
          pdf.text(cleanText(label), mx, y);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          setColor('text', colors.text);
          pdf.text(cleanText(val), mx, y + 5);
        });
        y += 16;
      }
      
      // WC Cycle Summary
      const wcc = Finance.computeWCCycle(report);
      if (wcc) {
        ensureSpace(60);
        addSectionTitle('Working Capital Cycle', colors.primary);
        
        const colW = contentWidth / 4;
        [['DSO (Receivables)', wcc.dso + ' days'], ['DIO (Inventory)', wcc.dio + ' days'], ['DPO (Payables)', wcc.dpo + ' days'], ['Cash Conversion', wcc.ccc + ' days']].forEach(([label, val], i) => {
          const mx = margin + i * colW;
          drawRect(mx, y, colW - 4, 22, colors.bg, colors.border, 3);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          setColor('text', colors.textLight);
          pdf.text(cleanText(label), mx + 4, y + 8);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          setColor('text', i === 3 ? (wcc.ccc <= 45 ? colors.success : colors.warning) : colors.text);
          pdf.text(cleanText(val), mx + 4, y + 17);
        });
        y += 30;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setColor('text', colors.text);
        pdf.text(cleanText('Cash Locked: ' + fmtMoney(wcc.cashLockedInCycle) + ' | Financing Cost: ' + fmtMoney(wcc.monthlyWCCost) + '/mo | Efficiency: ' + wcc.efficiencyScore + '/100'), margin, y);
        y += 12;
      }
      
      // Trend Analysis (if available via priorReports passed through)
      if (typeof savedScenarios === 'object' && savedScenarios?.__trendData) {
        const trendData = savedScenarios.__trendData;
        ensureSpace(60);
        addSectionTitle('Trend Analysis (' + trendData.periods + ' periods)', colors.primary);
        
        const tColW = contentWidth / 4;
        const dirs = trendData.directions;
        [['Sales', dirs.sales], ['Profit', dirs.profit], ['Margins', dirs.cm], ['Fixed Costs', dirs.fc]].forEach(([label, d], i) => {
          const isGoodDir = (i === 3) ? d.dir === 'down' : d.dir === 'up';
          const tx = margin + i * tColW;
          const bg = d.dir === 'flat' ? colors.bg : isGoodDir ? colors.successBg : colors.dangerBg;
          drawRect(tx, y, tColW - 4, 22, bg, colors.border, 3);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          setColor('text', colors.textLight);
          pdf.text(cleanText(label), tx + 4, y + 8);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          setColor('text', isGoodDir ? colors.success : d.dir === 'flat' ? colors.text : colors.danger);
          pdf.text(cleanText((d.dir === 'up' ? '+' : d.dir === 'down' ? '' : '') + d.pct + '%'), tx + 4, y + 17);
        });
        y += 30;
        
        [...(trendData.keyInsights || []), ...(trendData.healthInsights || [])].slice(0, 3).forEach(insight => {
          const bg = insight.type === 'good' ? colors.successBg : insight.type === 'bad' ? colors.dangerBg : colors.warningBg;
          const lines = wrapText(cleanText(insight.text), contentWidth - 16);
          const iH = lines.length * 5 + 8;
          ensureSpace(iH + 4);
          drawRect(margin, y, contentWidth, iH, bg, null, 3);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          setColor('text', colors.text);
          lines.forEach((ln, li) => pdf.text(ln, margin + 8, y + 6 + li * 5));
          y += iH + 4;
        });
      }
      
      addPageFooter();
    }
    
    // ========== NEXT STEPS PAGE ==========
    if (insights.nextSteps.length > 0) {
      ensureSpace(80);
      
      if (y > 100) {
        newPage('Recommendations');
      }
      
      addSectionTitle('Recommended Next Steps', colors.primary);
      
      const stepsH = insights.nextSteps.length * 14 + 12;
      drawRect(margin, y, contentWidth, stepsH, colors.bg, colors.border, 3);
      
      let stepY = y + 12;
      insights.nextSteps.forEach((step, i) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        setColor('text', colors.text);
        const stepText = (i + 1) + '. ' + cleanText(step);
        const lines = wrapText(stepText, contentWidth - 16);
        pdf.text(lines[0], margin + 8, stepY);
        stepY += 14;
      });
      
      y += stepsH + 10;
      
      if (pageNum > 0) {
        addPageFooter();
      }
    }
    
    // ========== COMMITMENTS PAGE ==========
    if (commitments && commitments.trim()) {
      ensureSpace(60);
      
      if (y > 150) {
        newPage('Action Items');
      }
      
      addSectionTitle('Commitments & Notes', colors.primary);
      
      const commitText = cleanText(commitments);
      const commitLines = wrapText(commitText, contentWidth - 16);
      const commitH = Math.min(commitLines.length * 5 + 16, 120);
      
      drawRect(margin, y, contentWidth, commitH, colors.white, colors.border, 3);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setColor('text', colors.text);
      commitLines.slice(0, 20).forEach((line, i) => {
        pdf.text(line, margin + 8, y + 12 + i * 5);
      });
      
      addPageFooter();
    }
    
    // Save PDF
    const safeFileName = clientName.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
    const fileName = 'BizLens_' + safeFileName + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    pdf.save(fileName);
    
    return fileName;
  };
  
  return { generatePDF };
})();
